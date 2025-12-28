import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    // Verify webhook signature if configured
    const signature = request.headers.get('x-docusign-signature-1')
    const secret = process.env.DOCUSIGN_WEBHOOK_SECRET
    
    if (secret && signature) {
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64')
      
      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    const envelopeId = payload.envelopeId || payload.data?.envelopeId
    const status = payload.status || payload.data?.envelopeSummary?.status

    if (!envelopeId) {
      return NextResponse.json({ error: 'No envelope ID' }, { status: 400 })
    }

    // Find the offer by envelope ID
    const offer = await prisma.offer.findUnique({
      where: { esignEnvelopeId: envelopeId },
    })

    if (!offer) {
      console.warn(`Offer not found for envelope: ${envelopeId}`)
      return NextResponse.json({ received: true })
    }

    // Update based on status
    let newStatus = offer.status
    let updateData: Record<string, unknown> = {}

    switch (status?.toLowerCase()) {
      case 'sent':
        newStatus = 'SENT'
        updateData.esignStatus = 'sent'
        break
      
      case 'delivered':
        newStatus = 'VIEWED'
        updateData.esignStatus = 'delivered'
        updateData.esignViewedAt = new Date()
        break
      
      case 'completed':
        newStatus = 'SIGNED'
        updateData.esignStatus = 'completed'
        updateData.esignSignedAt = new Date()
        break
      
      case 'declined':
        newStatus = 'DECLINED'
        updateData.esignStatus = 'declined'
        updateData.esignDeclinedAt = new Date()
        break
      
      case 'voided':
        newStatus = 'CANCELLED'
        updateData.esignStatus = 'voided'
        break
    }

    // Update offer
    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: newStatus,
        ...updateData,
      },
    })

    // Create event
    await prisma.offerEvent.create({
      data: {
        offerId: offer.id,
        type: status?.toLowerCase() || 'webhook',
        description: `DocuSign status: ${status}`,
        metadata: payload,
      },
    })

    // Update employee status if signed
    if (newStatus === 'SIGNED') {
      await prisma.employee.update({
        where: { id: offer.employeeId },
        data: { status: 'OFFER_SIGNED' },
      })
    }

    // Audit log
    await createAuditLog({
      actorType: 'webhook',
      action: 'OFFER_WEBHOOK_RECEIVED',
      resourceType: 'offer',
      resourceId: offer.id,
      metadata: {
        envelopeId,
        status,
        previousStatus: offer.status,
        newStatus,
      },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('DocuSign webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

