import React, { useState, useCallback } from 'react';
import { School, AnalysisData, FinalIssue, InterventionPlan, SupportPlan } from './types';
import { STAGE_TITLES } from './constants';
import Step1_MappingTable from './components/Step1_MappingTable';
import Step2_AnalysisDashboard from './components/Step2_AnalysisDashboard';
import Step3_IssueDefiner from './components/Step3_IssueDefiner';
import Step4_InterventionPlan from './components/Step4_InterventionPlan';

// Main App Component
const App: React.FC = () => {
    const [currentStage, setCurrentStage] = useState(0);
    const [schoolsData, setSchoolsData] = useState<School[]>([]);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [finalIssue, setFinalIssue] = useState<FinalIssue | null>(null);
    const [interventionPlan, setInterventionPlan] = useState<InterventionPlan | null>(null);
    const [supportPlan, setSupportPlan] = useState<SupportPlan | null>(null);

    const handleNextStage = useCallback(() => {
        setCurrentStage(prev => (prev < STAGE_TITLES.length - 1 ? prev + 1 : prev));
    }, []);

    const handlePrevStage = useCallback(() => {
        setCurrentStage(prev => (prev > 0 ? prev - 1 : prev));
    }, []);

    const handleReset = useCallback(() => {
        setSchoolsData([]);
        setAnalysisData(null);
        setFinalIssue(null);
        setInterventionPlan(null);
        setSupportPlan(null);
        setCurrentStage(0);
    }, []);
    
    const renderCurrentStage = () => {
        switch (currentStage) {
            case 0:
                return (
                    <Step1_MappingTable
                        schools={schoolsData}
                        setSchools={setSchoolsData}
                        onComplete={handleNextStage}
                    />
                );
            case 1:
                return (
                    <Step2_AnalysisDashboard
                        schoolsData={schoolsData}
                        onAnalysisComplete={(data) => {
                            setAnalysisData(data);
                            handleNextStage();
                        }}
                    />
                );
            case 2:
                 if (!analysisData) {
                    return <div className="text-center p-8 text-red-500">שגיאה: יש להשלים את שלב ניתוח הנתונים תחילה.</div>;
                 }
                 return (
                    <Step3_IssueDefiner 
                        analysisData={analysisData}
                        onIssueDefined={(issue) => {
                            setFinalIssue(issue);
                            handleNextStage();
                        }}
                    />
                 );
            case 3:
                if (!analysisData || !finalIssue) {
                     return <div className="text-center p-8 text-red-500">שגיאה: יש להשלים את השלבים הקודמים תחילה.</div>;
                }
                return (
                    <Step4_InterventionPlan
                        analysisData={analysisData}
                        finalIssue={finalIssue}
                        onPlanComplete={(ivp, sp) => {
                            setInterventionPlan(ivp);
                            setSupportPlan(sp);
                        }}
                         onReset={handleReset}
                    />
                );
            default:
                return <div>שלב לא ידוע</div>;
        }
    };
    
    // Progress Bar Component
    const ProgressBar: React.FC = () => (
        <div className="w-full bg-gray-200 rounded-full h-4 mb-8 shadow-inner">
            <div
                className="bg-gradient-to-r from-teal-400 to-blue-500 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStage + 1) / STAGE_TITLES.length) * 100}%` }}
            ></div>
        </div>
    );
    
    // Main App Layout
    return (
        <div className="bg-gray-100 min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-6 bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-teal-500 via-blue-500 to-purple-600">
                        מתכנן התערבויות MTSS
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        {STAGE_TITLES[currentStage]}
                    </p>
                </header>

                <main className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200">
                    <ProgressBar />
                    {renderCurrentStage()}
                </main>
                
                 <footer className="text-center mt-8 text-gray-500 text-sm">
                    <p>פותח ככלי תומך למפקחים ומנהלים במערכת החינוך</p>
                     <nav className="flex justify-center gap-4 mt-4">
                        {currentStage > 0 && (
                            <button onClick={handlePrevStage} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition transform hover:scale-105">
                                → חזור לשלב הקודם
                            </button>
                        )}
                        <button onClick={handleReset} className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition transform hover:scale-105">
                            🔄 התחל מחדש
                        </button>
                    </nav>
                </footer>
            </div>
        </div>
    );
};

export default App;
