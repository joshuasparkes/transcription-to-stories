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
    console.log('📥 [API] Received transcript cleanup request');
    const { transcript, model = 'gpt-5-mini' } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      console.error('❌ [API] Invalid transcript provided');
      return NextResponse.json(
        { error: 'Invalid transcript provided' },
        { status: 400 }
      );
    }

    console.log('📊 [API] Transcript length:', transcript.length, 'characters');
    console.log('📝 [API] Transcript preview (first 500 chars):', transcript.substring(0, 500) + '...');
    console.log('📝 [API] Transcript preview (last 200 chars):', '...' + transcript.substring(transcript.length - 200));
    console.log('🤖 [API] Model:', model);

    const prompt = `You are an expert editor specializing in improving transcript readability. Your task is to clean up and improve the following transcript while preserving all important information.

Please perform the following improvements:

1. **Fix Grammar & Sentence Structure**: Correct grammatical errors and ensure proper sentence structure
2. **Improve Readability**: Break up run-on sentences, add proper punctuation, and organize thoughts clearly
3. **Remove Filler Words**: Remove excessive filler words (um, uh, like, you know) while keeping natural speech patterns
4. **Fix Formatting**: Ensure proper capitalization and spacing
5. **Preserve Context**: Keep all important information, names, numbers, and key details intact
6. **Add Paragraph Breaks**: Organize content into logical paragraphs for better readability
7. **Maintain Speaker Intent**: Keep the meaning and intent of the original speech

Return ONLY the cleaned transcript. Do not add any commentary, explanations, or notes - just return the improved text.

Original Transcript:
${transcript}

Cleaned Transcript:`;

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

    const cleanedTranscript = completion.output_text;

    if (!cleanedTranscript) {
      console.error('❌ [API] No response content from OpenAI');
      throw new Error('No response from OpenAI');
    }

    console.log('📄 [API] Cleaned transcript length:', cleanedTranscript.length, 'characters');

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
      cleanedTranscript,
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
    console.error('❌ [API] Error cleaning transcript:', error);
    console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to clean transcript' },
      { status: 500 }
    );
  }
}
