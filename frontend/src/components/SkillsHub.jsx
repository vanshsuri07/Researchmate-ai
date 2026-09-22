import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, Loader2, Save } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function SkillsHub() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: 'custom',
    description: '',
    system_prompt: '',
    user_prompt_template: 'Paper Text Sample:\n{sample}\n\nTask:'
  });
  const [toast, setToast] = useState(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      const data = await res.json();
      if (res.ok) setSkills(data.skills);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleSaveSkill = async () => {
    if (!newSkill.name || !newSkill.system_prompt) {
      setToast('Name and System Prompt are required.');
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/skills/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSkill)
      });
      if (res.ok) {
        setToast('Skill uploaded successfully!');
        setNewSkill({
          name: '', category: 'custom', description: '',
          system_prompt: '', user_prompt_template: 'Paper Text Sample:\n{sample}\n\nTask:'
        });
        fetchSkills();
      }
    } catch (e) {
      setToast('Upload failed.');
    } finally {
      setUploading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Connectors & Skills Hub</h1>
        <p className="text-slate-600">Install and create custom Agent skills to process your papers.</p>
      </div>
      
      {toast && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col: Upload New Skill */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" /> Create Custom Skill
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Skill Name</label>
              <input type="text" value={newSkill.name} onChange={(e)=>setNewSkill({...newSkill, name: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="e.g. Peer Reviewer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={newSkill.description} onChange={(e)=>setNewSkill({...newSkill, description: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Critiques the methodology of a paper." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt</label>
              <textarea value={newSkill.system_prompt} onChange={(e)=>setNewSkill({...newSkill, system_prompt: e.target.value})} className="w-full border p-2 rounded-lg h-24" placeholder="You are an expert NeurIPS reviewer..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User Prompt Template (use {sample} for paper text)</label>
              <textarea value={newSkill.user_prompt_template} onChange={(e)=>setNewSkill({...newSkill, user_prompt_template: e.target.value})} className="w-full border p-2 rounded-lg h-24" />
            </div>
            <button onClick={handleSaveSkill} disabled={uploading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Skill
            </button>
          </div>
        </div>

        {/* Right Col: Available Skills */}
        <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" /> Active Skills ({skills.length})
          </h2>
          {loading ? (
             <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
          ) : (
            <div className="grid gap-4">
              {skills.map(skill => (
                <div key={skill.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">{skill.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{skill.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
