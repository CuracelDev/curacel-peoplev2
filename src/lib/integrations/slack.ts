import { WebClient } from '@slack/web-api'
import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'
import type {
  IntegrationConnector,
  ProvisionResult,
  DeprovisionResult,
  DeprovisionOptions,
  SlackConfig,
  SlackProvisionData,
  ProvisioningCondition,
} from './types'

export class SlackConnector implements IntegrationConnector {
  private config: SlackConfig
  private botClient: WebClient
  private adminClient: WebClient | null

  constructor(config: SlackConfig) {
    this.config = config
    this.botClient = new WebClient(config.botToken)
    this.adminClient = config.adminToken ? new WebClient(config.adminToken) : null
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.botClient.auth.test()
      if (!result.ok) {
        return { success: false, error: 'Auth test failed' }
      }

      // Validate required bot scopes for provisioning.
      // Without users:read.email we cannot reliably match employees by email.
      const scopesResult = await this.botClient.apiCall('apps.permissions.scopes.list', {})
      const scopes = (scopesResult as any)?.scopes as string[] | undefined
      const required = ['users:read', 'users:read.email', 'conversations:read', 'conversations:write']
      const missing = required.filter((s) => !scopes?.includes(s))
      if (missing.length) {
        return {
          success: false,
          error: `Slack bot token is missing required scopes: ${missing.join(', ')}. Add them in Slack app settings and reinstall the app.`,
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Slack',
      }
    }
  }

  private matchesCondition(employee: Employee, condition: ProvisioningCondition): boolean {
    for (const [key, value] of Object.entries(condition)) {
      if (value === undefined || value === null) continue
      
      const employeeValue = (employee as Record<string, unknown>)[key]
      if (typeof employeeValue === 'string' && typeof value === 'string') {
        if (employeeValue.toLowerCase() !== value.toLowerCase()) {
          return false
        }
      } else if (employeeValue !== value) {
        return false
      }
    }
    return true
  }

  private getProvisionDataForEmployee(
    employee: Employee,
    rules: AppProvisioningRule[]
  ): SlackProvisionData {
    const result: SlackProvisionData = {
      channels: [],
      userGroups: [],
    }

    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

    for (const rule of sortedRules) {
      if (!rule.isActive) continue
      
      const condition = rule.condition as ProvisioningCondition
      if (this.matchesCondition(employee, condition)) {
        const data = rule.provisionData as SlackProvisionData
        
        if (data.channels) {
          result.channels = [...(result.channels || []), ...data.channels]
        }
        
        if (data.userGroups) {
          result.userGroups = [...(result.userGroups || []), ...data.userGroups]
        }
      }
    }

    // Dedupe
    result.channels = [...new Set(result.channels)]
    result.userGroups = [...new Set(result.userGroups)]
    
    return result
  }

  async provisionEmployee(
    employee: Employee,
    app: App,
    rules: AppProvisioningRule[],
    existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    try {
      const provisionData = this.getProvisionDataForEmployee(employee, rules)
      
      // Prefer work email, fall back to personal email.
      const email = employee.workEmail || employee.personalEmail
      if (!email) {
        return {
          success: false,
          error: 'An email address is required for Slack provisioning.',
        }
      }

      let slackUserId: string | undefined

      // Check if user already exists
      if (existingAccount?.externalUserId) {
        slackUserId = existingAccount.externalUserId
        
        // Reactivate if deactivated
        try {
          await this.adminClient?.apiCall('admin.users.setRegular', {
            user_id: slackUserId,
            team_id: this.config.teamId || '',
          })
        } catch {
          // May fail if user is already active or method not available
        }
      } else {
        // Look up user by email
        try {
          const userLookup = await this.botClient.users.lookupByEmail({ email })
          if (userLookup.ok && userLookup.user?.id) {
            slackUserId = userLookup.user.id
          }
        } catch (error: any) {
          const slackError = error?.data?.error || error?.message || ''
          if (String(slackError).includes('missing_scope')) {
            return {
              success: false,
              error:
                'Slack bot token is missing the required scope `users:read.email`. Add it in your Slack app and reinstall the app, then retry.',
            }
          }
          // User not found - will need to invite
        }

        // If user not found, send invite
        if (!slackUserId) {
          try {
            // Note: admin.users.invite requires Slack Enterprise Grid or paid plan
            // For standard workspaces, you might need to use a different approach
            const channelIds =
              (provisionData.channels?.length ? provisionData.channels : null) ||
              (this.config.defaultChannels?.length ? this.config.defaultChannels : null)

            if (!channelIds?.length) {
              return {
                success: false,
                error: 'Slack provisioning requires default channels (or provisioning rule channels).',
              }
            }

            if (!this.adminClient) {
              return {
                success: false,
                error:
                  'Slack user not found in the workspace. Add an Admin token (Enterprise) to auto-invite, or invite the user manually, then retry.',
              }
            }

            const inviteResult = await this.adminClient.apiCall('admin.users.invite', {
              email,
              ...(this.config.teamId ? { team_id: this.config.teamId } : {}),
              channel_ids: channelIds.join(','),
            })
            
            if ((inviteResult as any)?.ok) {
              // The user ID won't be available until they accept
              return {
                success: true,
                externalEmail: email,
                provisionedResources: {
                  invited: true,
                  channels: channelIds,
                },
              }
            }
            const inviteErr = (inviteResult as any)?.error || 'unknown_error'
            return {
              success: false,
              error: `Slack invite failed: ${inviteErr}. Invite the user manually or ensure your Admin token has the correct scopes and plan.`,
            }
          } catch (error) {
            const slackError = (error as any)?.data?.error || (error as any)?.message || 'unknown_error'
            return {
              success: false,
              error: `Slack invite failed: ${slackError}. Invite the user manually or ensure your Admin token supports admin.users.invite.`,
            }
          }
        }
      }

      // Add to channels
      const addedChannels: string[] = []
      const desiredChannels =
        (provisionData.channels?.length ? provisionData.channels : null) ||
        (this.config.defaultChannels?.length ? this.config.defaultChannels : null)

      if (slackUserId && desiredChannels?.length) {
        const channelsResult = await this.botClient.conversations.list({
          types: 'public_channel,private_channel',
          limit: 1000,
        })

        const byName = new Map<string, string>()
        for (const c of channelsResult.channels || []) {
          if (!c.id || !c.name) continue
          byName.set(c.name, c.id)
        }

        for (const channelNameOrId of desiredChannels) {
          try {
            const cleaned = channelNameOrId.trim().replace(/^#/, '')
            const channelId = byName.get(cleaned) || (cleaned.startsWith('C') || cleaned.startsWith('G') ? cleaned : '')
            if (!channelId) continue

            await this.botClient.conversations.invite({
              channel: channelId,
              users: slackUserId,
            })
            addedChannels.push(channelNameOrId)
          } catch (error) {
            // User might already be in channel
            console.warn(`Failed to add user to channel ${channelNameOrId}:`, error)
          }
        }
      }

      return {
        success: true,
        externalUserId: slackUserId,
        externalEmail: email,
        provisionedResources: {
          channels: addedChannels,
          userGroups: provisionData.userGroups,
        },
      }
    } catch (error) {
      console.error('Slack provisioning error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to provision Slack account',
      }
    }
  }

  async deprovisionEmployee(
    employee: Employee,
    app: App,
    account: AppAccount,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    try {
      const slackUserId = account.externalUserId
      if (!slackUserId) {
        return { success: false, error: 'No Slack user ID found' }
      }

      // Deactivate user
      // Note: This requires Slack admin privileges
      try {
        if (!this.adminClient) throw new Error('Admin token not configured')
        await this.adminClient.apiCall('admin.users.setInactive', {
          user_id: slackUserId,
          team_id: this.config.teamId || '',
        })
      } catch (error) {
        // If admin method not available, we might need to remove from all channels
        console.warn('Admin deactivate failed, trying to remove from channels:', error)
        
        // List user's conversations and remove them
        const conversations = await this.botClient.users.conversations({
          user: slackUserId,
          types: 'public_channel,private_channel',
        })
        
        for (const channel of conversations.channels || []) {
          if (channel.id) {
            try {
              await this.botClient.conversations.kick({
                channel: channel.id,
                user: slackUserId,
              })
            } catch {
              // May fail for some channels
            }
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Slack deprovisioning error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deprovision Slack account',
      }
    }
  }
}

export function createSlackConnector(): SlackConnector | null {
  const botToken = process.env.SLACK_BOT_TOKEN
  const signingSecret = process.env.SLACK_SIGNING_SECRET

  if (!botToken) {
    console.warn('Slack integration not configured')
    return null
  }

  return new SlackConnector({
    botToken,
    signingSecret,
  })
}
