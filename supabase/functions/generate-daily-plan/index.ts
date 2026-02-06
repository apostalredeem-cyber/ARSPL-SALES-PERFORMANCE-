// This code should be deployed as a Supabase Edge Function: `generate-daily-plan`

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const { user_id, area_id } = await req.json()

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch leads for the area assigned to the user
    // Optimization: Sort by priority, then by distance (if possible)
    // For now: Sort by Priority + Status
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_staff_id', user_id)
        .or(`status.eq.new,status.eq.follow-up`)
        .order('priority_score', { ascending: false })
        .limit(10) // Daily limit

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })

    // 2. Format as a suggested work plan
    const suggestedPlan = leads.map((lead, index) => ({
        order: index + 1,
        lead_id: lead.id,
        lead_name: lead.name,
        priority: lead.priority_score,
        suggested_action: lead.status === 'new' ? 'Cold Visit' : 'Follow-up'
    }))

    return new Response(JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        suggested_plan: suggestedPlan,
        total_expected_visits: suggestedPlan.length
    }), {
        headers: { "Content-Type": "application/json" },
    })
})
