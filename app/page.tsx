'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';
import TiptapEditor from '@/components/TiptapEditor';
import { parseMarkdownToTiptapJson } from '@/lib/markdownParser';
import {
  Plus,
  FileText,
  Share2,
  Trash2,
  Upload,
  LogOut,
  User,
  Check,
  CloudLightning,
  AlertCircle,
  X,
  Sparkles,
  FileEdit,
  FolderOpen,
  Menu
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: any;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Share {
  id: string;
  shared_with_email: string;
  permission: 'viewer' | 'editor';
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Sidebar state for mobile responsiveness
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [isEditable, setIsEditable] = useState(true);

  // Sharing state
  const [shares, setShares] = useState<Share[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'editor' | 'viewer'>('editor');
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingError, setSharingError] = useState<string | null>(null);
  const [sharingSuccess, setSharingSuccess] = useState<string | null>(null);

  // Editor saving state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch documents once session is available
  const fetchDocuments = useCallback(async () => {
    if (!session) return;
    setLoadingDocs(true);
    setDocsError(null);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);

      // If there's an active doc, make sure to update its details in state
      if (activeDoc) {
        const updatedActive = data?.find(d => d.id === activeDoc.id);
        if (updatedActive) {
          setActiveDoc(updatedActive);
        }
      }
    } catch (err: any) {
      console.warn('Error fetching documents:', err.message || err);
      setDocsError(err.message || 'Could not connect to database table.');
    } finally {
      setLoadingDocs(false);
    }
  }, [session, activeDoc]);

  useEffect(() => {
    if (session) {
      fetchDocuments();
    }
  }, [session]);

  // Fetch shares for active document
  const fetchShares = async (docId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_shares')
        .select('id, shared_with_email, permission')
        .eq('document_id', docId);

      if (error) throw error;
      setShares(data || []);
    } catch (err: any) {
      console.warn('Error fetching shares:', err.message || err);
    }
  };

  useEffect(() => {
    if (activeDoc && activeDoc.user_id === session?.user?.id) {
      fetchShares(activeDoc.id);
    } else {
      setShares([]);
    }
  }, [activeDoc, session]);

  // Check editing permissions for the active document
  useEffect(() => {
    const checkPermission = async () => {
      if (!activeDoc || !session) return;
      if (activeDoc.user_id === session.user.id) {
        setIsEditable(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('document_shares')
          .select('permission')
          .eq('document_id', activeDoc.id)
          .eq('shared_with_email', session.user.email?.toLowerCase())
          .maybeSingle();

        if (error) throw error;
        if (data && data.permission === 'viewer') {
          setIsEditable(false);
        } else {
          setIsEditable(true);
        }
      } catch (err) {
        console.warn('Error checking permission:', err);
        setIsEditable(false);
      }
    };

    checkPermission();
  }, [activeDoc, session]);

  // Create document
  const createDocument = async () => {
    if (!session) return;
    try {
      const newDoc = {
        title: 'Untitled Document',
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Untitled Document' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Start writing here...' }]
            }
          ]
        },
        user_id: session.user.id
      };

      const { data, error } = await supabase
        .from('documents')
        .insert(newDoc)
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [data, ...prev]);
      setActiveDoc(data);
    } catch (err) {
      console.error('Error creating document:', err);
    }
  };

  // Delete document
  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== id));
      if (activeDoc?.id === id) {
        setActiveDoc(null);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document. Ensure you are the owner.');
    }
  };

  // Trigger autosave to database
  const saveDocumentContent = async (docId: string, updates: Partial<Document>) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;
      setSaveStatus('saved');
      
      // Update local state without refetching all docs to prevent scroll jumps
      setDocuments(prev =>
        prev.map(d => (d.id === docId ? { ...d, ...updates, updated_at: new Date().toISOString() } : d))
      );
    } catch (err) {
      console.error('Error saving content:', err);
      setSaveStatus('error');
    }
  };

  // Handle document title change
  const handleTitleChange = (newTitle: string) => {
    if (!activeDoc) return;
    
    const updatedDoc = { ...activeDoc, title: newTitle };
    setActiveDoc(updatedDoc);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      saveDocumentContent(activeDoc.id, { title: newTitle });
    }, 1000);
  };

  // Handle TipTap editor change
  const handleEditorChange = (newJson: any) => {
    if (!activeDoc) return;
    
    // We update local state to keep it in sync
    const updatedDoc = { ...activeDoc, content: newJson };
    setActiveDoc(updatedDoc);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      saveDocumentContent(activeDoc.id, { content: newJson });
    }, 1200);
  };

  // Handle file import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDoc) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsedJson = parseMarkdownToTiptapJson(text);
      
      // Update title if markdown has h1
      let newTitle = activeDoc.title;
      const firstNode = parsedJson.content[0];
      if (firstNode && firstNode.type === 'heading' && firstNode.attrs?.level === 1 && firstNode.content?.[0]?.text) {
        newTitle = firstNode.content[0].text;
      } else {
        // Strip extension for title
        newTitle = file.name.replace(/\.[^/.]+$/, "");
      }

      const updated = {
        title: newTitle,
        content: parsedJson
      };

      setActiveDoc({
        ...activeDoc,
        ...updated
      });

      await saveDocumentContent(activeDoc.id, updated);
    };
    reader.readAsText(file);
  };

  // Handle sharing action
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !shareEmail) return;

    setSharingError(null);
    setSharingSuccess(null);

    const emailToShare = shareEmail.trim().toLowerCase();

    if (emailToShare === session?.user?.email?.toLowerCase()) {
      setSharingError("You cannot share a document with yourself.");
      return;
    }

    try {
      const { error } = await supabase
        .from('document_shares')
        .insert({
          document_id: activeDoc.id,
          shared_with_email: emailToShare,
          permission: sharePermission,
          owner_id: session.user.id
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This document is already shared with this email.');
        }
        throw error;
      }

      setSharingSuccess(`Document shared with ${emailToShare}`);
      setShareEmail('');
      fetchShares(activeDoc.id);
    } catch (err: any) {
      setSharingError(err.message || 'Failed to share document.');
    }
  };

  // Delete share record
  const deleteShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('document_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      setShares(prev => prev.filter(s => s.id !== shareId));
    } catch (err) {
      console.error('Error removing share:', err);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setActiveDoc(null);
    setDocuments([]);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center bg-grid relative">
        <Sparkles className="w-10 h-10 text-zinc-400 animate-pulse mb-4" />
        <p className="text-zinc-500 text-sm">Loading workspace...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth onSessionActive={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans bg-grid relative">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

      {/* Sidebar backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-80 bg-zinc-950 md:bg-zinc-950/20 backdrop-blur-2xl border-r border-zinc-900/80 flex flex-col z-40 shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-zinc-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-indigo-400/20">
              A
            </span>
            <span className="font-bold tracking-tight text-lg text-zinc-200">Ajaia Editor</span>
            <span className="text-[10px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800/60">v1.0</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-4">
          <button
            onClick={() => {
              createDocument();
              setIsSidebarOpen(false);
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold rounded-lg text-sm transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/20"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-6 py-2">
          {/* My Documents */}
          <div>
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Documents
            </h3>
            {loadingDocs ? (
              <div className="px-3 py-2 text-sm text-zinc-600 animate-pulse">Loading list...</div>
            ) : docsError ? (
              <div className="mx-3 my-2 px-3 py-3 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg space-y-1.5">
                <p className="font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Database Error
                </p>
                <p className="text-[11px] leading-relaxed text-red-300 font-mono break-words">{docsError}</p>
                <p className="text-[10px] text-zinc-500 pt-1 leading-normal border-t border-red-900/20">
                  Did you run the SQL script in your Supabase Dashboard? Check your project setup instructions in the README.
                </p>
              </div>
            ) : documents.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-600 italic">No documents found</div>
            ) : (
              <div className="space-y-1">
                {documents.map((doc) => {
                  const isOwner = doc.user_id === session.user.id;
                  const isActive = activeDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setActiveDoc(doc);
                        setIsSidebarOpen(false);
                      }}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-indigo-600/10 text-white border-indigo-500/30 shadow-[inset_0_0_12px_rgba(99,102,241,0.03)]'
                          : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200 border-transparent hover:border-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <FileText className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                        <span className="truncate font-medium">{doc.title}</span>
                        {!isOwner && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/30">
                            Shared
                          </span>
                        )}
                      </div>
                      
                      {isOwner && (
                        <button
                          onClick={(e) => deleteDocument(doc.id, e)}
                          className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                <User className="w-4.5 h-4.5 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-300 truncate">
                  {session.user.email}
                </p>
                <p className="text-[10px] text-zinc-500">Connected</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {activeDoc ? (
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
              {/* Title Input & Save Status */}
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shrink-0"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    disabled={!isEditable}
                    className="w-full bg-transparent border-none text-2xl font-bold tracking-tight text-white placeholder-zinc-700 outline-none pr-6 focus:ring-0 disabled:opacity-80"
                    placeholder="Untitled Document"
                  />
                </div>

                {/* Save status badge */}
                <div className="flex items-center shrink-0">
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500 animate-pulse bg-zinc-900 px-2 py-1 rounded-full border border-zinc-800/40">
                      <CloudLightning className="w-3.5 h-3.5 animate-bounce" />
                      Saving
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-950/20 px-2 py-1 rounded-full border border-emerald-900/30">
                      <Check className="w-3.5 h-3.5" />
                      Saved
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/20 px-2 py-1 rounded-full border border-red-900/30">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Save Error
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="flex items-center gap-2">
                {/* File Upload Button */}
                {isEditable && (
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-850 hover:border-zinc-700/80 text-sm font-medium text-zinc-300 hover:text-white hover:shadow-sm transition-all cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Import File</span>
                    <span className="sm:hidden">Import</span>
                    <input
                      type="file"
                      accept=".txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Share Button (Only enabled for owner) */}
                {activeDoc.user_id === session.user.id ? (
                  <button
                    onClick={() => {
                      setSharingError(null);
                      setSharingSuccess(null);
                      setShowShareModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-850 hover:border-zinc-700/80 text-sm font-medium text-zinc-300 hover:text-white hover:shadow-sm transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                ) : (
                  <div className="text-xs text-zinc-500 bg-zinc-900/40 px-3 py-2 rounded-lg border border-zinc-800/40 select-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-pulse"></span>
                    Shared View-Only
                  </div>
                )}
              </div>
            </div>

            {/* Document Editor */}
            <div className="flex-1 flex flex-col">
              <TiptapEditor
                content={activeDoc.content}
                onChange={handleEditorChange}
                editable={isEditable}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col relative">
            {/* Mobile Top Bar for empty state */}
            <div className="md:hidden flex items-center p-4 border-b border-zinc-900/80 bg-zinc-950/20 backdrop-blur-md">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="ml-3 font-semibold text-sm text-zinc-300">Ajaia Editor</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 flex items-center justify-center text-zinc-500 mb-6 shadow-lg">
                <FileEdit className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-zinc-300">No Document Selected</h2>
              <p className="text-zinc-500 text-sm mt-2 max-w-sm">
                Select an existing document from the sidebar or create a new one to begin editing.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-350 font-semibold rounded-lg text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse Documents
                </button>
                <button
                  onClick={() => {
                    createDocument();
                    setIsSidebarOpen(false);
                  }}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Document
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Share Modal Dialog */}
      {showShareModal && activeDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-zinc-400" />
              Share Document
            </h3>
            <p className="text-zinc-500 text-xs mt-1.5 mb-6">
              Share "{activeDoc.title}" with other registered users via email address.
            </p>

            <form onSubmit={handleShare} className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="email"
                  required
                  placeholder="recipient@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full sm:flex-1 px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus:border-stone-500 rounded-lg text-zinc-100 placeholder-zinc-600 outline-none transition-all text-sm"
                />
                
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as 'editor' | 'viewer')}
                  className="w-full sm:w-28 px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-stone-500 rounded-lg text-zinc-300 outline-none text-sm cursor-pointer"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-lg text-sm transition-all shadow-md cursor-pointer shrink-0"
                >
                  Share
                </button>
              </div>

              {sharingError && (
                <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2 rounded">
                  {sharingError}
                </p>
              )}
              {sharingSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded">
                  {sharingSuccess}
                </p>
              )}
            </form>

            {/* List of currently shared users */}
            <div className="mt-6 border-t border-zinc-850 pt-5">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                People with access
              </h4>
              
              {shares.length === 0 ? (
                <p className="text-zinc-600 text-xs italic">Not shared with anyone yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800/40 px-3 py-2 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-zinc-300 truncate">{share.shared_with_email}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 capitalize shrink-0 border border-zinc-850">
                          {share.permission}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteShare(share.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-0.5 rounded cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
