import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Pricing per 1M tokens for different models
const MODEL_PRICING = {
  'gpt-5.1': {
    input: 1.50,
    output: 10.00,
  },
  'gpt-5-mini': {
    input: 0.10,
    output: 0.40,
  },
  'gpt-5-nano': {
    input: 0.05,
    output: 0.20,
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log('📥 [API] Received custom query request');
    const { transcript, query, model = 'gpt-5-mini' } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      console.error('❌ [API] Invalid transcript provided');
      return NextResponse.json(
        { error: 'Invalid transcript provided' },
        { status: 400 }
      );
    }

    if (!query || typeof query !== 'string') {
      console.error('❌ [API] Invalid query provided');
      return NextResponse.json(
        { error: 'Invalid query provided' },
        { status: 400 }
      );
    }

    console.log('📊 [API] Transcript length:', transcript.length, 'characters');
    console.log('📝 [API] Transcript preview (first 500 chars):', transcript.substring(0, 500) + '...');
    console.log('📝 [API] Transcript preview (last 200 chars):', '...' + transcript.substring(transcript.length - 200));
    console.log('📝 [API] Query:', query);
    console.log('🤖 [API] Model:', model);

    const prompt = `You are an AI assistant analyzing a transcript. Answer the following question about the transcript, and provide supporting quotes as evidence.

Question: ${query}

Transcript:
${transcript}

Please provide a clear, detailed answer based on the transcript content. 
`;

    console.log('🤖 [API] Sending request to OpenAI', model, '...');
    const startTime = Date.now();

    const completion = await openai.responses.create({
      model: model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            }
          ]
        }
      ]
    });

    const endTime = Date.now();
    console.log('⏱️  [API] OpenAI response received in', (endTime - startTime) / 1000, 'seconds');

    const content = completion.output_text;

    if (!content) {
      console.error('❌ [API] No response content from OpenAI');
      throw new Error('No response from OpenAI');
    }

    console.log('📄 [API] Response content length:', content.length, 'characters');

    // Extract token usage information
    const usage = completion.usage;
    const inputTokens = usage?.input_tokens || 0;
    const outputTokens = usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    console.log('💰 [API] Token usage:', {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens
    });

    // Calculate cost based on selected model
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['gpt-5-mini'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    console.log('💵 [API] Estimated cost: $' + totalCost.toFixed(4));

    const response = {
      response: content,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: totalTokens,
        inputCost: inputCost,
        outputCost: outputCost,
        totalCost: totalCost
      }
    };

    console.log('📤 [API] Sending response');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [API] Error processing custom query:', error);
    console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to process custom query' },
      { status: 500 }
    );
  }
}
