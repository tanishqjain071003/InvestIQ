import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error fetching holdings:', err);
    return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newUnits = body.units;
    const newInvested = body.units * body.purchase_nav;

    // Always record the individual transaction for accurate historical tracking
    await supabase.from('transactions').insert({
      scheme_code: body.scheme_code,
      scheme_name: body.scheme_name,
      units: newUnits,
      nav: body.purchase_nav,
      amount: newInvested,
      transaction_date: body.purchase_date,
    });

    // Check if this fund already exists in the portfolio
    const { data: existing } = await supabase
      .from('holdings')
      .select('*')
      .eq('scheme_code', body.scheme_code)
      .limit(1)
      .single();

    if (existing) {
      // Merge: add units and invested amount, compute weighted average NAV
      const totalUnits = existing.units + newUnits;
      const totalInvested = existing.invested_amount + newInvested;
      const weightedNAV = totalInvested / totalUnits;
      // Keep the earlier purchase date
      const earlierDate = new Date(existing.purchase_date) < new Date(body.purchase_date)
        ? existing.purchase_date
        : body.purchase_date;

      const { data, error } = await supabase
        .from('holdings')
        .update({
          units: totalUnits,
          invested_amount: totalInvested,
          purchase_nav: weightedNAV,
          purchase_date: earlierDate,
          fund_house: body.fund_house || existing.fund_house,
          category: body.category || existing.category,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // New fund - insert
    const { data, error } = await supabase
      .from('holdings')
      .insert({
        scheme_code: body.scheme_code,
        scheme_name: body.scheme_name,
        fund_house: body.fund_house,
        category: body.category,
        units: newUnits,
        purchase_nav: body.purchase_nav,
        purchase_date: body.purchase_date,
        invested_amount: newInvested,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error creating holding:', err);
    return NextResponse.json({ error: 'Failed to create holding' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting holding:', err);
    return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
  }
}
