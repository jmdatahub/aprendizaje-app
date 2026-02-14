import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, chatId, text } = body;

    if (!token || !chatId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: token, chatId, text' },
        { status: 400 }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || 'Unknown Telegram API error' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
