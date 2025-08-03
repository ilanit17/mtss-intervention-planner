
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AnalysisData, GeneratedIssue, FinalIssue } from '../types';
import { generateIssueSuggestions } from '../services/geminiService';

interface Step3Props {
  analysisData: AnalysisData;
  onIssueDefined: (issue: FinalIssue) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-blue-600">מפיק הצעות באמצעות AI...</p>
    </div>
);

const Step3_IssueDefiner: React.FC<Step3Props> = ({ analysisData, onIssueDefined }) => {
  const [internalStep, setInternalStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [issueSuggestions, setIssueSuggestions] = useState<GeneratedIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GeneratedIssue | null>(null);

  const rootCauses = useMemo(() => {
    const causes: string[] = [];
    if (!analysisData) return causes;

    const lowestPerformingArea = [...analysisData.heatmapData].sort((a,b) => b.percentage - a.percentage)[0];
    if(lowestPerformingArea && lowestPerformingArea.percentage > 30) {
        causes.push(`ביצועים נמוכים באופן עקבי בתחום "${lowestPerformingArea.field}", כאשר ${lowestPerformingArea.percentage}% מבתי הספר מוגדרים כבעלי ציון נמוך.`);
    }

    const tier3Count = analysisData.mtssClassification.tier3.length;
    if (tier3Count > 0 && tier3Count / analysisData.summary.totalSchools > 0.2) {
        causes.push(`ריכוז גבוה (${tier3Count} בתי ספר) בשכבת ההתערבות האינטנסיבית (Tier 3), המצביע על אתגר מערכתי עמוק.`);
    }
    
    analysisData.insights.forEach(insight => {
        if(!insight.title.toLowerCase().includes('error')) {
            causes.push(insight.text);
        }
    });

    if(causes.length === 0) {
        causes.push("לא זוהו אתגרים מרכזיים אוטומטיים. ייתכן שהביצועים בכל התחומים גבוהים.");
    }

    return causes.slice(0, 3); // Limit to 3 root causes for brevity
  }, [analysisData]);

  useEffect(() => {
    if (rootCauses.length > 0) {
      setLoading(true);
      generateIssueSuggestions(rootCauses)
        .then(suggestions => {
          setIssueSuggestions(suggestions);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to get issue suggestions:", error);
          setLoading(false);
        });
    }
  }, [rootCauses]);

  const handleSelectIssue = useCallback((issue: GeneratedIssue) => {
    setSelectedIssue(issue);
    setInternalStep(2);
  }, []);

  const handleUpdateIssue = useCallback((field: keyof GeneratedIssue, value: string) => {
    if (selectedIssue) {
      setSelectedIssue(prev => prev ? { ...prev, [field]: value } : null);
    }
  }, [selectedIssue]);
  
  const handleFinalize = useCallback(() => {
    if (selectedIssue) {
      const final: FinalIssue = {
        ...selectedIssue,
        originalChallenge: analysisData.insights[0]?.title || 'אתגר כללי',
        rootCauses: rootCauses,
      };
      onIssueDefined(final);
    }
  }, [selectedIssue, analysisData, rootCauses, onIssueDefined]);

  const renderDataSummary = () => (
    <div className="bg-gray-100 p-6 rounded-lg border-r-4 border-blue-500 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">✅ סיכום הנתונים שחולצו לניתוח:</h3>
      <p className="font-semibold text-gray-700">גורמי שורש מרכזיים שזוהו:</p>
      <ul className="list-disc list-inside space-y-1 text-gray-600">
        {rootCauses.map((rc, i) => <li key={i}>{rc}</li>)}
      </ul>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">בחירת סוגייה מרכזית</h2>
          <p className="text-gray-600 mt-1">בהתבסס על גורמי השורש שזוהו, הנה מספר כיוונים אפשריים. בחר את הסוגייה הרלוונטית ביותר.</p>
      </div>
      {renderDataSummary()}
      {loading ? <LoadingSpinner /> : (
        <div className="grid md:grid-cols-2 gap-6">
          {issueSuggestions.map((issue, index) => (
            <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-6 flex flex-col shadow-md hover:shadow-xl hover:border-blue-400 transition-all duration-300">
              <h4 className="text-xl font-bold text-blue-700 border-b-2 border-blue-200 pb-2 mb-3">{issue.title}</h4>
              <p className="text-gray-700 flex-grow">כיצד ניתן ל<strong>{issue.action}</strong> את <strong>{issue.subject}</strong> ב<strong>{issue.context}</strong>, על מנת ל<strong>{issue.result}</strong>?</p>
              <div className="mt-4 bg-blue-50 p-4 rounded-md border-r-4 border-blue-300 text-sm">
                <p><strong>🧠 רציונל:</strong> {issue.rationale}</p>
                <p className="mt-2"><strong>🎯 רמת התערבות:</strong> <span className="font-semibold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{issue.level}</span></p>
              </div>
              <button onClick={() => handleSelectIssue(issue)} className="w-full mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">בחר סוגייה זו</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const renderStep2 = () => {
    if (!selectedIssue) return null;
    return (
        <div>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">הגדרה והתאמה אישית של הסוגייה</h2>
                <p className="text-gray-600 mt-1">דייק את ניסוח הסוגייה שנבחרה כך שתתאים להקשר ולמטרות שלך.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border space-y-4">
                <div className="form-group">
                    <label className="font-bold text-gray-700">כיצד ניתן ל... (הפעולה)</label>
                    <input type="text" value={selectedIssue.action} onChange={e => handleUpdateIssue('action', e.target.value)} className="w-full p-2 border rounded-md mt-1"/>
                </div>
                <div className="form-group">
                    <label className="font-bold text-gray-700">את... (הסוגייה)</label>
                    <input type="text" value={selectedIssue.subject} onChange={e => handleUpdateIssue('subject', e.target.value)} className="w-full p-2 border rounded-md mt-1"/>
                </div>
                <div className="form-group">
                    <label className="font-bold text-gray-700">ב... (ההקשר)</label>
                    <input type="text" value={selectedIssue.context} onChange={e => handleUpdateIssue('context', e.target.value)} className="w-full p-2 border rounded-md mt-1"/>
                </div>
                <div className="form-group">
                    <label className="font-bold text-gray-700">על מנת ל... (התוצאה הרצויה)</label>
                    <input type="text" value={selectedIssue.result} onChange={e => handleUpdateIssue('result', e.target.value)} className="w-full p-2 border rounded-md mt-1"/>
                </div>
                <div className="form-group">
                    <label className="font-bold text-gray-700">חזון אסטרטגי</label>
                    <textarea rows={3} value={selectedIssue.vision} onChange={e => handleUpdateIssue('vision', e.target.value)} className="w-full p-2 border rounded-md mt-1"/>
                </div>
                <div className="bg-blue-100 p-4 rounded-lg border-2 border-dashed border-blue-300 mt-4">
                    <strong className="text-blue-800">הסוגייה המרכזית:</strong>
                    <p className="mt-1 text-lg text-blue-900">כיצד ניתן ל<strong>{selectedIssue.action || "..."}</strong> את <strong>{selectedIssue.subject || "..."}</strong> ב<strong>{selectedIssue.context || "..."}</strong>, על מנת ל<strong>{selectedIssue.result || "..."}</strong>?</p>
                </div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
                <button onClick={() => setInternalStep(1)} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow hover:bg-gray-700">חזור לבחירה</button>
                <button onClick={handleFinalize} className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white text-lg font-bold rounded-lg shadow-xl hover:from-green-600 hover:to-teal-700 transition transform hover:scale-105">
                    שמור והמשך לבניית תוכנית התערבות ←
                </button>
            </div>
        </div>
    );
  };
  
  return internalStep === 1 ? renderStep1() : renderStep2();
};

export default Step3_IssueDefiner;
