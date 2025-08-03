
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisData, FinalIssue, GeneratedIssue, Insight } from '../types';

const API_KEY = process.env.API_KEY;

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const generateContentWithRetry = async (request: any, retries = 3, delay = 1000) => {
    if (!ai) {
      throw new Error("מפתח ה-API של Gemini אינו מוגדר.");
    }
    try {
        const response: GenerateContentResponse = await ai.models.generateContent(request);
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Gemini API call failed, retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, delay));
            return generateContentWithRetry(request, retries - 1, delay * 2);
        }
        console.error("Gemini API call failed after multiple retries:", error);
        throw error;
    }
};

export const generateInsights = async (analysisData: AnalysisData): Promise<Insight[]> => {
    if (!ai) {
        return [{ title: "שגיאת תצורה", text: "מפתח ה-API של Gemini אינו מוגדר. לא ניתן להפיק תובנות AI." }];
    }
    
    const prompt = `
      You are an expert educational supervisor analyzing school performance data.
      Based on the following JSON summary of school data, generate 3-4 key insights.
      Focus on correlations, surprising findings, and actionable recommendations.
      Format your response as a JSON array of objects, where each object has a "title" and a "text" property.
      The text should be a concise paragraph. Keep it professional and data-driven.
      Important: The "title" and "text" for each insight MUST be in Hebrew.
      
      Data:
      ${JSON.stringify({
        summary: analysisData.summary,
        heatmap: analysisData.heatmapData.map(d => ({ field: d.field, percentageOfLowPerformingSchools: d.percentage })),
        mtssDistribution: {
          tier1: analysisData.mtssClassification.tier1.length,
          tier2: analysisData.mtssClassification.tier2.length,
          tier3: analysisData.mtssClassification.tier3.length
        },
        mostCommonChallenges: Object.entries(analysisData.challengesAnalysis)
            .flatMap(([category, data]) => Object.entries(data.challenges).map(([challenge, count]) => ({ category, challenge, count })))
            .sort((a,b) => b.count - a.count)
            .slice(0, 5)
      }, null, 2)}
    `;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "A short, catchy title for the insight." },
                            text: { type: Type.STRING, description: "A paragraph explaining the insight and its implications." }
                        },
                        required: ["title", "text"]
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        const insights: Insight[] = JSON.parse(jsonText);
        return insights;
    } catch (error) {
        console.error("Error generating insights with Gemini:", error);
        return [
            { title: "שגיאה בהפקת תובנות", text: "לא ניתן היה ליצור קשר עם שירותי הבינה המלאכותית. אנא בדוק את חיבור הרשת או מפתח ה-API." }
        ];
    }
};

export const generateIssueSuggestions = async (rootCauses: string[]): Promise<GeneratedIssue[]> => {
    if (!ai) {
        console.error("Gemini API key is not configured.");
        return [];
    }

    const prompt = `
      You are an expert in organizational development and educational leadership.
      You are given a list of root causes for a problem in a school system.
      Your task is to reframe these root causes into 3-4 actionable "How might we..." style questions, which we call "central issues".
      For each generated issue, provide a comprehensive JSON object.

      Root Causes:
      ${rootCauses.map(rc => `- ${rc}`).join('\n')}

      Format your response as a JSON array of objects. Each object must have the following properties:
      - "title": A short, thematic name for the suggested issue (e.g., "פיתוח ההון האנושי בצוות").
      - "action": The verb phrase for the issue. What is the action to be taken? (e.g., "לפתח ולהעצים").
      - "subject": The noun phrase. What is being acted upon? (e.g., "התפיסות והאמונות המקצועיות של הצוותים החינוכיים").
      - "context": The "how" or "where". What is the context of the action? (e.g., "באמצעות פיתוח מקצועי מותאם, למידת עמיתים וליווי פרטני").
      - "result": The desired outcome. What is the goal? (e.g., "להוביל לשינוי בפרקטיקות ההוראה ולשפר את הישגי התלמידים").
      - "vision": A strategic, long-term vision statement for the solution of this issue.
      - "rationale": A brief explanation of why this issue is a good response to the provided root causes.
      - "level": The level of intervention. Choose one from: "פרט (צוות)", "מערכת (ארגון)", "מערכת (משאבים/תכנים)", "אסטרטגיה (התערבות)".

      Important: All string values in the final JSON objects ("title", "action", "subject", "context", "result", "vision", "rationale", "level") MUST be in Hebrew.
    `;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            action: { type: Type.STRING },
                            subject: { type: Type.STRING },
                            context: { type: Type.STRING },
                            result: { type: Type.STRING },
                            vision: { type: Type.STRING },
                            rationale: { type: Type.STRING },
                            level: { type: Type.STRING }
                        },
                        required: ["title", "action", "subject", "context", "result", "vision", "rationale", "level"]
                    }
                }
            }
        });
        const jsonText = response.text.trim();
        const issues: GeneratedIssue[] = JSON.parse(jsonText);
        return issues;
    } catch (error) {
        console.error("Error generating issue suggestions with Gemini:", error);
        return [];
    }
};

export const generatePlanSuggestions = async (finalIssue: FinalIssue): Promise<{mainGoal: string, smartObjectives: string[]}> => {
     if (!ai) {
        console.error("Gemini API key is not configured.");
        return {mainGoal: "", smartObjectives: []};
    }
    
    const prompt = `
      You are an AI assistant for educational strategy. Given a central issue and a vision, generate a main goal and 3 SMART objectives for an intervention plan.

      Central Issue:
      "How can we ${finalIssue.action} ${finalIssue.subject} in ${finalIssue.context}, in order to ${finalIssue.result}?"

      Strategic Vision:
      "${finalIssue.vision}"

      Please generate a JSON object with two keys:
      1. "mainGoal": A single, concise string for the main goal of the intervention.
      2. "smartObjectives": An array of 3 strings, where each string is a SMART (Specific, Measurable, Achievable, Relevant, Time-bound) objective.
      
      Important: The "mainGoal" and all strings in the "smartObjectives" array MUST be in Hebrew.
    `;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainGoal: { type: Type.STRING },
                        smartObjectives: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["mainGoal", "smartObjectives"]
                }
            }
        });
        const jsonText = response.text.trim();
        const suggestions: {mainGoal: string, smartObjectives: string[]} = JSON.parse(jsonText);
        return suggestions;
    } catch (error) {
        console.error("Error generating plan suggestions with Gemini:", error);
        return {mainGoal: "", smartObjectives: []};
    }
};
