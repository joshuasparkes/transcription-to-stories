import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { UserStory } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('📥 [API] Received request to extract requirements');
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      console.error('❌ [API] Invalid transcript provided');
      return NextResponse.json(
        { error: 'Invalid transcript provided' },
        { status: 400 }
      );
    }

    console.log('📊 [API] Transcript length:', transcript.length, 'characters');
    console.log('📝 [API] Transcript preview:', transcript.substring(0, 200) + '...');

    const prompt = `You are a business analyst expert. Analyze the following transcript from a meeting or conversation and extract all requirements, converting them into user stories.

For each requirement found, provide:
1. Epic Name - A high-level category or feature area
2. Requirement # - A unique identifier (e.g., REQ-001, REQ-002)
3. Requirement - A brief description of what is needed
4. User Story - In the format "As a [user type], I want to [action] so that [benefit]"
5. Acceptance Criteria - Multiple specific, testable conditions (provide at least 4, but add more if needed)

IMPORTANT: You MUST return a JSON object with a "requirements" array, even if there is only ONE requirement.

Example format:
{
  "requirements": [
    {
      "epicName": "Example Epic",
      "requirementNumber": "REQ-001",
      "requirement": "Description of requirement",
      "userStory": "As a user, I want to do something so that I get value",
      "acceptanceCriteria1": "Criteria 1",
      "acceptanceCriteria2": "Criteria 2",
      "acceptanceCriteria3": "Criteria 3",
      "acceptanceCriteria4": "Criteria 4"
    }
  ]
}

If there are more than 4 acceptance criteria for any requirement, add additional fields as acceptanceCriteria5, acceptanceCriteria6, etc.

Transcript:
${transcript}

Return ONLY valid JSON with the "requirements" array. Do not return a single object - always wrap in an array.`;

    console.log('🤖 [API] Sending request to OpenAI GPT-5 mini...');
    const startTime = Date.now();

    const completion = await openai.responses.create({
      model: 'gpt-5-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `You are a business analyst expert who extracts requirements and creates user stories from transcripts. Always respond with valid JSON only.\n\n${prompt}`
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
    console.log('📝 [API] Raw OpenAI response:', content);

    let userStories: UserStory[];
    try {
      const parsed = JSON.parse(content);
      console.log('✅ [API] Successfully parsed JSON response');
      console.log('🔍 [API] Response structure:', JSON.stringify(parsed, null, 2));

      // Handle both array response and object with array property
      if (Array.isArray(parsed)) {
        console.log('📋 [API] Response is a direct array');
        userStories = parsed;
      } else if (parsed.userStories && Array.isArray(parsed.userStories)) {
        console.log('📋 [API] Found userStories array in response');
        userStories = parsed.userStories;
      } else if (parsed.requirements && Array.isArray(parsed.requirements)) {
        console.log('📋 [API] Found requirements array in response');
        userStories = parsed.requirements;
      } else {
        // If it's an object with keys, try to extract the first array found
        console.log('🔍 [API] Searching for array in response object...');
        const allKeys = Object.keys(parsed);
        console.log('🔑 [API] Available keys:', allKeys);

        const firstArrayKey = allKeys.find(key => Array.isArray(parsed[key]));
        if (firstArrayKey) {
          console.log('📋 [API] Found array under key:', firstArrayKey);
          userStories = parsed[firstArrayKey];
        } else {
          // OpenAI returned a single user story object instead of an array
          // Check if it looks like a valid user story object
          if (parsed.epicName || parsed.requirement || parsed.userStory) {
            console.log('📦 [API] Single user story object detected, wrapping in array');
            userStories = [parsed];
          } else {
            console.error('❌ [API] Could not find array in response and object does not look like a user story');
            console.error('❌ [API] Response object:', JSON.stringify(parsed, null, 2));
            userStories = [];
          }
        }
      }

      console.log('✅ [API] Extracted', userStories.length, 'user stories');
      if (userStories.length > 0) {
        console.log('📝 [API] First user story:', JSON.stringify(userStories[0], null, 2));
      }
    } catch (parseError) {
      console.error('❌ [API] Failed to parse OpenAI response:', parseError);
      console.error('❌ [API] Raw content:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

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

    // GPT-5 mini pricing (as of 2025)
    // Input: $0.10 per 1M tokens
    // Output: $0.40 per 1M tokens
    const inputCostPer1M = 0.10;
    const outputCostPer1M = 0.40;

    const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;
    const totalCost = inputCost + outputCost;

    console.log('💵 [API] Estimated cost: $' + totalCost.toFixed(4));

    const response = {
      userStories,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: totalTokens,
        inputCost: inputCost,
        outputCost: outputCost,
        totalCost: totalCost
      }
    };

    console.log('📤 [API] Sending response with', response.userStories.length, 'user stories');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [API] Error extracting requirements:', error);
    console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to extract requirements' },
      { status: 500 }
    );
  }
}
