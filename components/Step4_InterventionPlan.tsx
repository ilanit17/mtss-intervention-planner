
import React, { useState, useCallback, useEffect } from 'react';
import type { AnalysisData, FinalIssue, InterventionPlan, SupportPlan, SupportPlanAction } from '../types';
import { ACTION_CATEGORIES, PARTNER_CATEGORIES, RESOURCE_CATEGORIES, TASK_STATUSES, TIER_OPTIONS, TARGET_AUDIENCE_OPTIONS, FREQUENCY_OPTIONS, SUGGESTED_ACTIONS_BANK, SUGGESTED_PARTNERS_BANK, SUGGESTED_RESOURCES_BANK } from '../constants';
import { generatePlanSuggestions } from '../services/geminiService';

interface Step4Props {
  analysisData: AnalysisData;
  finalIssue: FinalIssue;
  onPlanComplete: (interventionPlan: InterventionPlan, supportPlan: SupportPlan) => void;
  onReset: () => void;
}

const WIZARD_STEPS = [
  "הגדרת מטרות ויעדים",
  "תכנון התערבות MTSS",
  "סיכום תוכנית ההתערבות",
  "בחירת פעולות ליבה לליווי",
  "זיהוי שותפים ומשאבים",
  "בניית תוכנית עבודה אופרטיבית",
  "סיכום והפקת דוח",
];

const Step4_InterventionPlan: React.FC<Step4Props> = ({ analysisData, finalIssue, onPlanComplete, onReset }) => {
  const [wizardStep, setWizardStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [interventionPlan, setInterventionPlan] = useState<InterventionPlan>({
    mainGoal: '', smartObjectives: [], tier1: { outcomes: [] }, tier2Groups: [], tier3: { outcomes: [] },
  });
  
  const [supportPlan, setSupportPlan] = useState<SupportPlan>({
    coreActions: [], partners: [], resources: [], operationalPlan: [],
  });
  
  useEffect(() => {
    setLoading(true);
    generatePlanSuggestions(finalIssue).then(suggestions => {
      if(suggestions.mainGoal && suggestions.smartObjectives.length > 0) {
        setInterventionPlan(prev => ({...prev, mainGoal: suggestions.mainGoal, smartObjectives: suggestions.smartObjectives}));
      }
      setLoading(false);
    }).catch(err => {
        console.error("Failed to get plan suggestions:", err);
        setLoading(false);
    })
  }, [finalIssue]);

  const handleNext = () => setWizardStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  const handleBack = () => setWizardStep(prev => Math.max(prev - 1, 0));

  const handleInterventionChange = <T extends keyof InterventionPlan>(field: T, value: InterventionPlan[T]) => {
    setInterventionPlan(prev => ({...prev, [field]: value}));
  };
  
  const handleSupportChange = <T extends keyof SupportPlan>(field: T, value: SupportPlan[T]) => {
    setSupportPlan(prev => ({...prev, [field]: value}));
  };
  
  // Handlers for dynamic lists
  const addTier2Group = () => handleInterventionChange('tier2Groups', [...interventionPlan.tier2Groups, {id: Date.now().toString(), name: `קבוצת שכבה 2 ${interventionPlan.tier2Groups.length + 1}`, outcomes:[], schools:[]}]);
  const updateTier2Group = (id: string, field: string, value: any) => {
    const updated = interventionPlan.tier2Groups.map(g => g.id === id ? {...g, [field]:value} : g);
    handleInterventionChange('tier2Groups', updated);
  };
  const removeTier2Group = (id: string) => handleInterventionChange('tier2Groups', interventionPlan.tier2Groups.filter(g => g.id !== id));

  const addAction = (action?: Partial<SupportPlanAction>) => {
    const newAction = { id: Date.now().toString(), name: '', description: '', category: ACTION_CATEGORIES[0], tier: TIER_OPTIONS[0], targetAudience: TARGET_AUDIENCE_OPTIONS[0], frequency: FREQUENCY_OPTIONS[0], ...action };
    handleSupportChange('coreActions', [...supportPlan.coreActions, newAction]);
  };
  const updateAction = (id: string, field: string, value: any) => handleSupportChange('coreActions', supportPlan.coreActions.map(a => a.id === id ? {...a, [field]:value} : a));
  const removeAction = (id: string) => handleSupportChange('coreActions', supportPlan.coreActions.filter(a => a.id !== id));
  
  // Similar handlers for partners, resources, tasks...

  const downloadFullReport = () => {
    // Logic to generate and download the full HTML report
    console.log("Downloading full report...", { interventionPlan, supportPlan });
    alert("פונקציונליות הורדת הדוח המלא עדיין בפיתוח.");
  };

  const renderContent = () => {
    switch (wizardStep) {
        case 0: // Goals
            return (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">הגדרת מטרות ויעדים</h3>
                    {loading && <p>טוען הצעות AI...</p>}
                    <div>
                        <label className="font-semibold">מטרה מרכזית</label>
                        <textarea value={interventionPlan.mainGoal} onChange={e => handleInterventionChange('mainGoal', e.target.value)} rows={3} className="w-full p-2 border rounded mt-1"/>
                    </div>
                     <div>
                        <label className="font-semibold">יעדים תפעוליים (SMART)</label>
                        <textarea value={interventionPlan.smartObjectives.join('\n')} onChange={e => handleInterventionChange('smartObjectives', e.target.value.split('\n'))} rows={4} className="w-full p-2 border rounded mt-1"/>
                    </div>
                </div>
            );
        case 1: // MTSS Plan
            return (
                <div className="space-y-6">
                     <h3 className="text-xl font-bold">תכנון התערבות MTSS</h3>
                     {/* Tier 1 */}
                     <div className="p-4 bg-green-50 border-r-4 border-green-500 rounded">
                         <h4 className="font-bold text-green-700">שכבה 1: אוניברסלי</h4>
                         <textarea value={interventionPlan.tier1.outcomes.join('\n')} onChange={e => handleInterventionChange('tier1', {outcomes: e.target.value.split('\n')})} placeholder="תוצרים ופעולות לכלל בתי הספר" rows={3} className="w-full p-2 border rounded mt-1"/>
                     </div>
                     {/* Tier 2 */}
                      <div className="p-4 bg-yellow-50 border-r-4 border-yellow-500 rounded">
                         <h4 className="font-bold text-yellow-700">שכבה 2: קבוצתית</h4>
                         {interventionPlan.tier2Groups.map(group => (
                             <div key={group.id} className="p-3 my-2 bg-white border rounded">
                                 <input value={group.name} onChange={e => updateTier2Group(group.id, 'name', e.target.value)} className="font-semibold w-full border-b mb-2"/>
                                 <textarea value={group.outcomes.join('\n')} onChange={e => updateTier2Group(group.id, 'outcomes', e.target.value.split('\n'))} rows={2} placeholder="תוצרים לקבוצה" className="w-full p-2 border rounded mt-1"/>
                                 <button onClick={() => removeTier2Group(group.id)} className="text-red-500 text-xs mt-1">הסר קבוצה</button>
                             </div>
                         ))}
                         <button onClick={addTier2Group} className="mt-2 bg-yellow-500 text-white px-3 py-1 rounded">הוסף קבוצת שכבה 2</button>
                     </div>
                     {/* Tier 3 */}
                      <div className="p-4 bg-red-50 border-r-4 border-red-500 rounded">
                         <h4 className="font-bold text-red-700">שכבה 3: אינטנסיבית</h4>
                         <textarea value={interventionPlan.tier3.outcomes.join('\n')} onChange={e => handleInterventionChange('tier3', {outcomes: e.target.value.split('\n')})} placeholder="תוצרים לבתי ספר בתמיכה אינטנסיבית" rows={3} className="w-full p-2 border rounded mt-1"/>
                     </div>
                </div>
            );
        case 2: // Intervention Summary
            return (
                <div>
                     <h3 className="text-xl font-bold mb-4">סיכום תוכנית ההתערבות</h3>
                     <div className="p-4 bg-gray-50 rounded prose">
                         <h4>מטרה מרכזית:</h4>
                         <p>{interventionPlan.mainGoal}</p>
                         <h4>יעדים:</h4>
                         <ul>{interventionPlan.smartObjectives.map((o,i) => <li key={i}>{o}</li>)}</ul>
                     </div>
                </div>
            );
        case 3: // Core Actions
             return (
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-xl font-bold">פעולות ליבה לליווי</h3>
                        {supportPlan.coreActions.map((action) => (
                            <div key={action.id} className="bg-white p-4 border rounded shadow-sm">
                                <input value={action.name} onChange={e => updateAction(action.id, 'name', e.target.value)} className="text-lg font-semibold w-full border-b mb-2" />
                                <textarea value={action.description} onChange={e => updateAction(action.id, 'description', e.target.value)} rows={2} className="w-full p-2 border rounded mt-1" />
                                <button onClick={() => removeAction(action.id)} className="text-red-500 text-xs mt-1">הסר פעולה</button>
                            </div>
                        ))}
                         <button onClick={() => addAction()} className="mt-2 bg-green-500 text-white px-3 py-1 rounded">הוסף פעולה</button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border">
                        <h4 className="font-semibold mb-2">מאגר הצעות</h4>
                        {SUGGESTED_ACTIONS_BANK.map((sugg, i) => (
                             <div key={i} className="p-2 border-b hover:bg-gray-100">
                                <p className="font-semibold">{sugg.name}</p>
                                <button onClick={() => addAction(sugg)} className="text-blue-500 text-xs">הוסף</button>
                            </div>
                        ))}
                    </div>
                </div>
             );
        case 6: // Final Report
            return (
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-bold text-teal-700">✅ כל השלבים הושלמו!</h3>
                    <p className="text-lg text-gray-600">התוכנית המלאה מוכנה להורדה.</p>
                    <button onClick={downloadFullReport} className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-xl hover:bg-blue-700 transition transform hover:scale-105">
                        📄 הורד דוח מסכם ומלא
                    </button>
                </div>
            );
        default: return <div className="p-4 bg-gray-100 rounded-md">בבנייה... שלב {wizardStep + 1}</div>;
    }
  };

  return (
      <div className="space-y-6">
          <div className="flex items-center space-x-4 rtl:space-x-reverse overflow-x-auto pb-2">
              {WIZARD_STEPS.map((step, index) => (
                  <div key={index} className={`flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0 ${index > 0 ? 'before:content-[""] before:w-8 before:h-0.5 before:bg-gray-300' : ''}`}>
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${wizardStep >= index ? 'bg-teal-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {wizardStep > index ? '✓' : index + 1}
                       </div>
                       <span className={`font-semibold ${wizardStep >= index ? 'text-teal-700' : 'text-gray-500'}`}>{step}</span>
                  </div>
              ))}
          </div>
          <div className="p-6 bg-white rounded-lg shadow-inner border min-h-[300px]">
              {renderContent()}
          </div>
          <div className="flex justify-between items-center">
              <div>
                  {wizardStep > 0 && <button onClick={handleBack} className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700">חזור</button>}
              </div>
              <div>
                  {wizardStep < WIZARD_STEPS.length - 1 && <button onClick={handleNext} className="px-6 py-2 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700">המשך</button>}
              </div>
          </div>
      </div>
  );
};

export default Step4_InterventionPlan;
