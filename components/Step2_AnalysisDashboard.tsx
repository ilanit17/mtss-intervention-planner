import React, { useState, useEffect, useMemo } from 'react';
import type { School, Score, AnalysisData, Insight, SchoolForAnalysis } from '../types';
import { ALL_FIELDS_FOR_HEATMAP, FIELD_HEBREW_MAP } from '../constants';
import { generateInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Step2Props {
  schoolsData: School[];
  onAnalysisComplete: (data: AnalysisData) => void;
}

const COLORS = ['#27ae60', '#2ecc71', '#f1c40f', '#f39c12', '#e74c3c'];

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-500"></div>
    </div>
);

const AnalysisDashboard: React.FC<Step2Props> = ({ schoolsData, onAnalysisComplete }) => {
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);

    const performAnalysis = useMemo(() => {
        return (data: School[]): AnalysisData => {
            const getCharacterization = (school: School): string => {
                const scores = ALL_FIELDS_FOR_HEATMAP.map(field => parseInt(school[field as keyof School] as string) || 0).filter(s => s > 0);
                if (scores.length === 0) return 'יציב';
                const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                if (avgScore <= 2.5) return 'בסיכון גבוה';
                if (avgScore <= 3.5) return 'עם אתגרים מתונים';
                return 'יציב';
            };

            const getTier = (school: School): 1 | 2 | 3 => {
                 const scores = ALL_FIELDS_FOR_HEATMAP.map(s => parseInt(school[s as keyof School] as string) || 0).filter(s => s > 0);
                 const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
                 if (avg <= 2.5) return 3;
                 if (avg <= 3.5) return 2;
                 return 1;
            }

            const schoolsForAnalysis: SchoolForAnalysis[] = data.map(school => ({
                ...school,
                characterization: getCharacterization(school),
                specificChallenges: [], // This will be populated later if needed
                tier: getTier(school)
            }));
            
            const tier1 = schoolsForAnalysis.filter(s => s.tier === 1);
            const tier2 = schoolsForAnalysis.filter(s => s.tier === 2);
            const tier3 = schoolsForAnalysis.filter(s => s.tier === 3);

            const summary = {
                totalSchools: data.length,
                totalStudents: data.reduce((sum, s) => sum + (parseInt(s.students) || 0), 0),
                riskySchools: schoolsForAnalysis.filter(s => s.characterization === 'בסיכון גבוה').length,
                excellentSchools: schoolsForAnalysis.filter(s => s.characterization === 'יציב').length,
            };

            // Simplified data structures for recharts
            const subjectDistribution = {};
            const orgFields = ['climate', 'stability', 'leadership', 'collaboration', 'parentInvolvement'];
            const organizationalData = orgFields.map(field => {
                const scores = data.map(s => parseInt(s[field as keyof School] as string) || 0).filter(s => s > 0);
                return { name: FIELD_HEBREW_MAP[field], value: scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0 };
            });

            const overallPerformanceData = [
                { name: 'נמוך (1-2.5)', value: tier3.length },
                { name: 'בינוני (2.51-3.5)', value: tier2.length },
                { name: 'גבוה (3.51-5)', value: tier1.length }
            ];

            const schoolSizeData = [
                { name: 'קטן (עד 250)', value: data.filter(s => (parseInt(s.students) || 0) <= 250).length },
                { name: 'בינוני (251-400)', value: data.filter(s => (parseInt(s.students) || 0) > 250 && (parseInt(s.students) || 0) <= 400).length },
                { name: 'גדול (401-600)', value: data.filter(s => (parseInt(s.students) || 0) > 400 && (parseInt(s.students) || 0) <= 600).length },
                { name: 'גדול מאוד (600+)', value: data.filter(s => (parseInt(s.students) || 0) > 600).length },
            ].filter(d => d.value > 0);


            const heatmapData = ALL_FIELDS_FOR_HEATMAP.map(field => {
                const lowSchools = data.filter(s => (parseInt(s[field as keyof School] as string) || 0) <= 2).length;
                const percentage = data.length > 0 ? Math.round((lowSchools / data.length) * 100) : 0;
                return { field: FIELD_HEBREW_MAP[field], percentage, lowSchools };
            });

            return {
                schools: schoolsForAnalysis,
                summary,
                subjectDistribution,
                challengesAnalysis: {}, // placeholder
                mtssClassification: { tier1, tier2, tier3 },
                insights: [],
                heatmapData,
                organizationalData,
                overallPerformanceData,
                schoolSizeData,
            };
        };
    }, []);

    useEffect(() => {
        setLoading(true);
        const data = performAnalysis(schoolsData);
        generateInsights(data).then(insights => {
            setAnalysisData({ ...data, insights });
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setAnalysisData({ ...data, insights: [{ title: 'שגיאה', text: 'לא ניתן היה להפיק תובנות AI.' }]});
            setLoading(false);
        });
    }, [schoolsData, performAnalysis]);
    
    if (loading) {
        return <LoadingSpinner />;
    }

    if (!analysisData) {
        return <div className="text-center p-8 text-red-500">לא הצלחנו לנתח את הנתונים.</div>;
    }
    
    const { summary, mtssClassification, insights, heatmapData, organizationalData, overallPerformanceData, schoolSizeData } = analysisData;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-100 p-6 rounded-xl shadow-md text-center"><h3 className="text-blue-800 text-lg font-semibold">📚 סך בתי ספר</h3><div className="text-blue-900 text-4xl font-bold mt-2">{summary.totalSchools}</div></div>
                <div className="bg-green-100 p-6 rounded-xl shadow-md text-center"><h3 className="text-green-800 text-lg font-semibold">👨‍🎓 סך תלמידים</h3><div className="text-green-900 text-4xl font-bold mt-2">{summary.totalStudents.toLocaleString()}</div></div>
                <div className="bg-red-100 p-6 rounded-xl shadow-md text-center"><h3 className="text-red-800 text-lg font-semibold">⚠️ בתי ספר בסיכון</h3><div className="text-red-900 text-4xl font-bold mt-2">{summary.riskySchools}</div></div>
                <div classBox="bg-yellow-100 p-6 rounded-xl shadow-md text-center"><h3 className="text-yellow-800 text-lg font-semibold">⭐ בתי ספר מובילים</h3><div className="text-yellow-900 text-4xl font-bold mt-2">{summary.excellentSchools}</div></div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">🎯 סיווג MTSS - חלוקה לשכבות התערבות</h2>
                <div className="space-y-6">
                    <div className="bg-green-50 p-6 rounded-lg border-r-8 border-green-500 shadow"><div className="flex justify-between items-center"><h3 className="text-xl font-bold text-green-700">שכבה 1 - מענה אוניברסלי</h3><span className="bg-green-600 text-white px-4 py-1 rounded-full font-bold">{mtssClassification.tier1.length}</span></div><p className="text-gray-600 mt-2">כלל בתי הספר הזכים למענה אוניברסלי - פיתוח מקצועי, לווי שוטף ותמיכה בסיסית.</p></div>
                    <div className="bg-yellow-50 p-6 rounded-lg border-r-8 border-yellow-500 shadow"><div className="flex justify-between items-center"><h3 className="text-xl font-bold text-yellow-700">שכבה 2 - תמיכה ממוקדת</h3><span className="bg-yellow-500 text-white px-4 py-1 rounded-full font-bold">{mtssClassification.tier2.length}</span></div><p className="text-gray-600 mt-2">בתי ספר עם אתגרים מתונים הזקוקים להתערבות ממוקדת נוסף על המענה האוניברסלי.</p></div>
                    <div className="bg-red-50 p-6 rounded-lg border-r-8 border-red-500 shadow"><div className="flex justify-between items-center"><h3 className="text-xl font-bold text-red-700">שכבה 3 - התערבות אינטנסיבית</h3><span className="bg-red-600 text-white px-4 py-1 rounded-full font-bold">{mtssClassification.tier3.length}</span></div><p className="text-gray-600 mt-2">בתי ספר בסיכון גבוה הזקוקים להתערבות מיידית ואינטנסיבית.</p></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">🌡️ מפת חום - אחוז בתי ספר עם ציון נמוך (1-2)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={heatmapData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="field" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="אחוז בתי ספר" dataKey="percentage" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Tooltip formatter={(value) => `${value}%`} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                     <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">🏢 רמות תפקוד ארגוני (ממוצע)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={organizationalData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" domain={[0, 5]}/>
                             <YAxis type="category" dataKey="name" width={100} />
                             <Tooltip />
                             <Bar dataKey="value" fill="#82ca9d" />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                     <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">📈 מדד תפקוד כללי (מס' בתי ספר)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={overallPerformanceData}>
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis dataKey="name" />
                             <YAxis />
                             <Tooltip />
                             <Bar dataKey="value">
                                {overallPerformanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS.reverse()[index % COLORS.length]} />
                                ))}
                             </Bar>
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                     <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">🏢 התפלגות גודל בתי ספר</h3>
                     <ResponsiveContainer width="100%" height={300}>
                         <PieChart>
                             <Pie data={schoolSizeData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                                {schoolSizeData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#667eea', '#764ba2', '#8e44ad', '#9b59b6'][index % 4]} />)}
                             </Pie>
                             <Tooltip formatter={(value, name) => [`${value} בתי ספר`, name]}/>
                         </PieChart>
                     </ResponsiveContainer>
                 </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">💡 תובנות מרכזיות ודפוסים (מבסוס AI)</h2>
                <div className="space-y-4">
                    {insights.map((insight, index) => (
                        <div key={index} className="bg-gradient-to-r from-teal-50 to-blue-50 p-5 rounded-lg border-r-4 border-teal-500 shadow">
                            <h4 className="font-bold text-teal-800 text-lg">{insight.title}</h4>
                            <p className="text-gray-700 mt-1">{insight.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 text-center">
                <button onClick={() => onAnalysisComplete(analysisData)} className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white text-lg font-bold rounded-lg shadow-xl hover:from-green-600 hover:to-teal-700 transition transform hover:scale-105">
                   המשך להגדרת סוגיה מרכזית →
                </button>
            </div>
        </div>
    );
};

export default AnalysisDashboard;
