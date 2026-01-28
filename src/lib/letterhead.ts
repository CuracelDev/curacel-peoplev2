type OrganizationLetterhead = {
  name: string
  logoUrl?: string | null
  letterheadEmail?: string | null
  letterheadWebsite?: string | null
  letterheadAddress?: string | null
  letterheadPhone?: string | null
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeWebsiteHref(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function normalizeWebsiteForStorage(value: string | null | undefined) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null
  return normalizeWebsiteHref(trimmed)
}

export function normalizeEmailForStorage(value: string | null | undefined) {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

export function normalizePhoneForStorage(value: string | null | undefined) {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

export function normalizeAddressForStorage(value: string | null | undefined) {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

function normalizePhoneHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, '')
  return cleaned || phone.trim()
}

function toAbsoluteUrl(url: string, baseUrl?: string) {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed
  if (!baseUrl) return trimmed
  return new URL(trimmed, baseUrl).toString()
}

function buildContactParts(org: OrganizationLetterhead) {
  const parts: string[] = []

  if (org.letterheadEmail) {
    const email = org.letterheadEmail.trim()
    parts.push(
      `<a href="mailto:${encodeURIComponent(email)}" style="color:#0b57d0; text-decoration:underline;">${escapeHtml(email)}</a>`
    )
  }

  if (org.letterheadWebsite) {
    const website = org.letterheadWebsite.trim()
    const href = normalizeWebsiteHref(website)
    const label = website.replace(/^https?:\/\//i, '')
    parts.push(
      `<a href="${escapeHtml(href)}" style="color:#0b57d0; text-decoration:underline;">${escapeHtml(label)}</a>`
    )
  }

  if (org.letterheadAddress) {
    parts.push(`<span style="color:#111827;">${escapeHtml(org.letterheadAddress.trim())}</span>`)
  }

  if (org.letterheadPhone) {
    const phone = org.letterheadPhone.trim()
    const href = normalizePhoneHref(phone)
    parts.push(
      `<a href="tel:${escapeHtml(href)}" style="color:#111827; text-decoration:none;">${escapeHtml(phone)}</a>`
    )
  }

  return parts
}

export function wrapAgreementHtmlWithLetterhead(
  bodyHtml: string,
  org: OrganizationLetterhead,
  opts?: { baseUrl?: string; fallbackLogoPath?: string }
) {
  const alreadyWrapped = bodyHtml.includes('data-curacel-letterhead="1"')
  if (alreadyWrapped) return bodyHtml

  const baseUrl = opts?.baseUrl
  const fallbackLogoPath = opts?.fallbackLogoPath ?? '/logo.png'

  const logoSrc = org.logoUrl
    ? toAbsoluteUrl(org.logoUrl, baseUrl)
    : baseUrl
      ? toAbsoluteUrl(fallbackLogoPath, baseUrl)
      : fallbackLogoPath

  const contactParts = buildContactParts(org)
  const contactLine = contactParts.length
    ? contactParts.join(' <span style="color:#9ca3af;">|</span> ')
    : ''

  const safeName = escapeHtml(org.name)

  const logoHtml = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="${safeName}" style="height:52px; max-width:260px; width:auto; object-fit:contain; display:inline-block;" />`
    : `<div style="font-size:20px; font-weight:700; color:#111827;">${safeName}</div>`

  return `
    <div data-curacel-letterhead="1" style="color:#111827;">
      <div style="text-align:center; padding:12px 0 8px;">
        ${logoHtml}
        ${
          contactLine
            ? `<div style="margin-top:10px; font-size:12px; line-height:1.4; overflow-wrap:anywhere; word-break:break-word;">${contactLine}</div>`
            : ''
        }
      </div>
      <hr style="border:0; border-top:1px solid #e5e7eb; margin:12px 0 20px;" />
      <div data-curacel-document-body="1">
        ${bodyHtml}
      </div>
    </div>
  `
}
