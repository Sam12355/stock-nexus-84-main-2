import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { moveoutListId, createdBy, itemCount, branchId, items } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all staff members in the same branch
    const { data: staffMembers, error: staffError } = await supabaseClient
      .from('profiles')
      .select('id, name, email, phone')
      .eq('branch_id', branchId)
      .in('role', ['staff', 'assistant_manager'])

    if (staffError) {
      console.error('Error fetching staff members:', staffError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch staff members' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!staffMembers || staffMembers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No staff members found in this branch' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification for each staff member
    const notifications = staffMembers.map(staff => ({
      user_id: staff.id,
      title: 'New Moveout List Created',
      message: `${createdBy} has created a new moveout list with ${itemCount} items. Please review the items that need to be moved out.`,
      type: 'moveout_list',
      data: {
        moveout_list_id: moveoutListId,
        created_by: createdBy,
        item_count: itemCount,
        items: items
      },
      is_read: false,
      created_at: new Date().toISOString()
    }))

    // Insert notifications
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert(notifications)

    if (notificationError) {
      console.error('Error creating notifications:', notificationError)
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send WhatsApp notifications if phone numbers are available
    for (const staff of staffMembers) {
      if (staff.phone) {
        try {
          const whatsappMessage = `🏢 *Moveout List Notification*\n\n` +
            `Manager: ${createdBy}\n` +
            `Items: ${itemCount}\n` +
            `Branch: ${branchId}\n\n` +
            `Please check your dashboard for details.`

          await supabaseClient.functions.invoke('send-whatsapp-notification', {
            body: {
              phone: staff.phone,
              message: whatsappMessage
            }
          })
        } catch (whatsappError) {
          console.warn(`Failed to send WhatsApp to ${staff.name}:`, whatsappError)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent successfully',
        staff_notified: staffMembers.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-moveout-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


