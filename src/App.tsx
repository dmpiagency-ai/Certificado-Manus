/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { 
  Award,
  AlignLeft,
  AlignCenter,
  CheckCircle2,
  RotateCcw,
  Download,
  Info,
  AlertTriangle,
  Loader2,
  PhoneCall,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Image as ImageIcon,
  Type,
  List,
  Wand2,
  Printer,
  Move
} from 'lucide-react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';

// Custom hook to persist state in localStorage (Auto-save)
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn("Error reading localStorage", error);
      return initialValue;
    }
  });

  useEffect(() => {
    const handleStorageSync = (e: CustomEvent) => {
      if (e.detail.key === 'ALL_CERT_KEYS' || e.detail.key === key) {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      }
    };
    window.addEventListener('local-storage-sync', handleStorageSync as EventListener);
    return () => window.removeEventListener('local-storage-sync', handleStorageSync as EventListener);
  }, [key, initialValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = typeof value === 'function' ? (value as (val: T) => T)(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn("Error setting localStorage", error);
    }
  };
  return [storedValue, setValue];
}

// Global History Manager for Undo/Redo
let historyStack: Record<string, string>[] = [];
let historyIndex = -1;

export const saveHistorySnapshot = () => {
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cert-') && key !== 'cert-cache-version' && key !== 'cert-guest-credits') {
      snapshot[key] = localStorage.getItem(key) || '';
    }
  }
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(snapshot);
  if (historyStack.length > 30) historyStack.shift();
  historyIndex = historyStack.length - 1;
};

export const undoHistory = () => {
  if (historyIndex > 0) {
    historyIndex--;
    const snapshot = historyStack[historyIndex];
    Object.keys(snapshot).forEach(key => localStorage.setItem(key, snapshot[key]));
    window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: { key: 'ALL_CERT_KEYS' } }));
  }
};

export const redoHistory = () => {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const snapshot = historyStack[historyIndex];
    Object.keys(snapshot).forEach(key => localStorage.setItem(key, snapshot[key]));
    window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: { key: 'ALL_CERT_KEYS' } }));
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redoHistory();
      else undoHistory();
    }
  });
  setTimeout(() => { if (historyStack.length === 0) saveHistorySnapshot(); }, 1000);
}

// Draggable + Resizable Block Wrapper (Adobe Illustrator Style)
const DraggableBlock = ({ children, posKey, defaultPos = { x: 0, y: 0 }, setSnapGuide }: any) => {
  const [savedPos, setSavedPos] = useLocalStorage<{x: number, y: number}>(posKey, defaultPos);
  const [savedSize, setSavedSize] = useLocalStorage<{w: number|null, h: number|null}>(`${posKey}-size`, { w: null, h: null });
  
  const x = useMotionValue(savedPos.x);
  const y = useMotionValue(savedPos.y);
  const blockRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });
  const [size, setSize] = useState<{w: number|null, h: number|null}>(savedSize);

  // Sync position visually when undo/redo fires
  useEffect(() => {
    x.set(savedPos.x);
    y.set(savedPos.y);
  }, [savedPos.x, savedPos.y, x, y]);

  // Sync size from undo/redo
  useEffect(() => {
    setSize(savedSize);
  }, [savedSize.w, savedSize.h]);
  
  const dragControls = useDragControls();
  const [isHovered, setIsHovered] = useState(false);

  // ── Resize logic ──────────────────────────────────────────────────
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizing.current = true;
    const rect = blockRef.current?.getBoundingClientRect();
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: rect?.width ?? 300,
      h: rect?.height ?? 60,
    };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dw = ev.clientX - resizeStart.current.mouseX;
      const dh = ev.clientY - resizeStart.current.mouseY;
      const newW = Math.max(80, resizeStart.current.w + dw);
      const newH = Math.max(24, resizeStart.current.h + dh);
      setSize({ w: newW, h: newH });
    };
    const onUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setSize(prev => {
        setSavedSize(prev);
        setTimeout(() => saveHistorySnapshot(), 10);
        return prev;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  
  return (
    <motion.div
      ref={blockRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      style={{
        x, y,
        position: 'relative',
        width: size.w ? `${size.w}px` : undefined,
        minHeight: size.h ? `${size.h}px` : undefined,
      }}
      onDrag={() => {
        if (Math.abs(x.get()) < 15) { if (setSnapGuide) setSnapGuide(true); }
        else { if (setSnapGuide) setSnapGuide(false); }
      }}
      onDragEnd={() => {
        if (setSnapGuide) setSnapGuide(false);
        let finalX = x.get();
        let finalY = y.get();
        if (Math.abs(finalX) < 15) { finalX = 0; x.set(0); }
        setSavedPos({ x: finalX, y: finalY });
        setTimeout(() => saveHistorySnapshot(), 10);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group outline-none transition-all flex justify-center ${
        isHovered ? 'ring-2 ring-dashed ring-[#d4af37]/60 bg-[#d4af37]/5' : ''
      } ${size.w ? '' : 'w-full'}`}
    >
      {/* Drag Handle (top center) */}
      <div 
        className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-[#112344] rounded-md shadow-lg text-[#d4af37] z-50 cursor-grab active:cursor-grabbing hover:scale-110 no-print"
        onPointerDown={(e) => dragControls.start(e)}
        title="Arrastar livremente"
      >
        <Move className="w-3.5 h-3.5" />
      </div>

      {/* Resize Handle (bottom right corner) */}
      {isHovered && (
        <div
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#d4af37] rounded-sm shadow-md cursor-se-resize z-50 no-print flex items-center justify-center"
          onMouseDown={onResizeMouseDown}
          title="Redimensionar"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 7L7 1M4 7L7 4M7 7V7" stroke="#112344" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Width label shown while hovering */}
      {isHovered && size.w && (
        <div className="absolute -top-3 right-0 text-[9px] font-mono text-[#d4af37]/80 bg-[#112344] px-1.5 py-0.5 rounded no-print">
          {Math.round(size.w)}px
        </div>
      )}

      <div style={{ width: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        {children}
      </div>
    </motion.div>
  );
};

const ContentEditable = ({ html, onChange, className = "", tagName = 'div', onFocus, onBlur }: any) => {
  const contentEditableRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html) {
      contentEditableRef.current.innerHTML = html;
    }
  }, [html]);

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const value = e.currentTarget.innerHTML;
    if (value !== html) {
      onChange(value);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    handleInput(e);
    if (onBlur) onBlur(e);
    setTimeout(() => saveHistorySnapshot(), 10);
  };

  const Tag = tagName as any;

  return (
    <Tag
      ref={contentEditableRef}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none hover:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.9)] focus:bg-blue-50/30 rounded transition-all cursor-text min-w-[20px] empty:before:content-['(vazio)'] empty:before:text-gray-300 empty:before:italic block md:inline-block ${className}`}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onInput={handleInput}
    />
  );
};

export default function App() {
  const [isSaved, setIsSaved] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<{ credits: number, whatsapp: string } | null>(null);
  const [guestCredits, setGuestCredits] = useLocalStorage<number>('cert-guest-credits', 2);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [whatsappStr, setWhatsappStr] = useState('');
  const [passwordStr, setPasswordStr] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // certScale is now derived from baseScale * zoomLevel
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [draggedGradeIdx, setDraggedGradeIdx] = useState<number | null>(null);
  const [snapGuide, setSnapGuide] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Versioned cache reset — runs synchronously on first render, before useLocalStorage reads.
  // Bump CACHE_VERSION whenever default content changes to push new defaults to all users.
  useState(() => {
    const CACHE_VERSION = 'v4';
    if (typeof window !== 'undefined' && window.localStorage.getItem('cert-cache-version') !== CACHE_VERSION) {
      ['cert-logoText1','cert-logoText2','cert-title','cert-line1','cert-line2',
       'cert-line3','cert-line4','cert-line5','cert-sig1Name','cert-sig1Role',
       'cert-grades','cert-logoImg', 'cert-guest-credits',
       'cert-pos-header','cert-pos-title','cert-pos-line1','cert-pos-line2',
       'cert-pos-line3','cert-pos-line4','cert-pos-line5','cert-pos-grades',
       'cert-pos-sig1','cert-pos-sig2'].forEach(k => window.localStorage.removeItem(k));
      window.localStorage.setItem('cert-cache-version', CACHE_VERSION);
    }
  });

  const [logoImg, setLogoImg] = useLocalStorage<string | null>('cert-logoImg', null);
  const [logoText1, setLogoText1] = useLocalStorage('cert-logoText1', '<strong>COMUNIDADE</strong>&nbsp;|');
  const [logoText2, setLogoText2] = useLocalStorage('cert-logoText2', 'DE LÍNGUAS');
  const [title, setTitle] = useLocalStorage('cert-title', 'CERTIFICATE');

  const [line1, setLine1] = useLocalStorage('cert-line1', 'Efigenio Cardiga José Vuma, headmaster of Language Community School Certifies that <strong style="color: #374151;">Maria Das Dores Marcelino Mussa</strong>');
  const [line2, setLine2] = useLocalStorage('cert-line2', 'Born on 9<sup>th</sup> March 2006 with BI Nº 0701062860610 Issued on 18 / 08 / 2022 In Cidade Da Beira .');
  const [line3, setLine3] = useLocalStorage('cert-line3', 'Place of birth: Beira &nbsp; Parents: Marcelino Mussa and Estrela Custavo Vilanculo');
  const [line4, setLine4] = useLocalStorage('cert-line4', 'Concluded the 5<sup>th</sup> level of English Course in this institution, she was submitted to the final exams in 2026 (two thousand and twenty-six )');
  const [line5, setLine5] = useLocalStorage('cert-line5', 'Having got the following classification');
  
  const [grades, setGrades] = useLocalStorage('cert-grades', [
    { subject: 'Writing', percent: '65 %', spell: 'Sixty Five Percent' },
    { subject: 'Speaking', percent: '70 %', spell: 'Seventy Percent' },
    { subject: 'Average', percent: '65 %', spell: 'Sixty Five Percent' }
  ]);

  const [sig1Name, setSig1Name] = useLocalStorage('cert-sig1Name', '');
  const [sig1Role, setSig1Role] = useLocalStorage('cert-sig1Role', '');

  // Derived credits: only guests consume credits. Authenticated users (admin/developer) export freely.
  const isAdmin = !!user;
  const currentCredits = isAdmin ? Infinity : guestCredits;

  // Responsive scale: recalculate whenever the window resizes
  const [baseScale, setBaseScale] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const certScale = baseScale * zoomLevel;

  useEffect(() => {
    const computeScale = () => {
      const scaleX = (window.innerWidth - 40) / 1123;
      const scaleY = (window.innerHeight - 120) / 794;
      const raw = Math.min(scaleX, scaleY);
      setBaseScale(Math.min(1, Math.max(0.2, raw)));
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, []);

  useEffect(() => {
    // Check Auth State — track inner snapshot unsubscribe to avoid memory leak
    let userProfileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (currentUser) => {
      // Cleanup previous profile listener before setting up a new one
      if (userProfileUnsub) {
        userProfileUnsub();
        userProfileUnsub = null;
      }

      setUser(currentUser);
      
      if (currentUser) {
        // 1. User profile listener (store unsubscribe for cleanup)
        const userRef = doc(db, 'users', currentUser.uid);
        userProfileUnsub = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as { credits: number, whatsapp: string });
          }
        });

        // 2. Load template from Cloud
        try {
          const templateRef = doc(db, 'templates', `default_${currentUser.uid}`);
          const templateSnap = await getDoc(templateRef);
          if (templateSnap.exists()) {
            const data = templateSnap.data();
            if (data.logoImg) setLogoImg(data.logoImg);
            if (data.logoText1) setLogoText1(data.logoText1);
            if (data.logoText2) setLogoText2(data.logoText2);
            if (data.title) setTitle(data.title);
            if (data.line1) setLine1(data.line1);
            if (data.line2) setLine2(data.line2);
            if (data.line3) setLine3(data.line3);
            if (data.line4) setLine4(data.line4);
            if (data.line5) setLine5(data.line5);
            if (data.sig1Name) setSig1Name(data.sig1Name);
            if (data.sig1Role) setSig1Role(data.sig1Role);
            if (data.grades) setGrades(data.grades);
          }
        } catch (err) {
          console.error("Cloud load error:", err);
        }
      } else {
        setUserData(null);
      }
      
      setIsAppLoading(false);
    });

    return () => {
      authUnsub();
      if (userProfileUnsub) userProfileUnsub();
    };
  }, []);

  // Real-time Cloud Sync (Debounced 3s)
  // Note: createdAt is intentionally NOT sent here to avoid breaking Firestore update rules
  // (the rule checks incoming().createdAt == existing().createdAt)
  useEffect(() => {
    if (!user || isAppLoading) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const templateRef = doc(db, 'templates', `default_${user.uid}`);
        await setDoc(templateRef, {
          ownerId: user.uid,
          logoImg,
          logoText1,
          logoText2,
          title,
          line1,
          line2,
          line3,
          line4,
          line5,
          sig1Name,
          sig1Role,
          grades,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error("Cloud sync error:", err);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    user, logoImg, logoText1, logoText2, title,
    line1, line2, line3, line4, line5,
    sig1Name, sig1Role, grades
  ]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!whatsappStr || !passwordStr) {
      setAuthError('Preencha o WhatsApp e a Senha.');
      return;
    }

    // Use virtualized email for Firebase Auth based on phone number
    const rawNumber = whatsappStr.replace(/\D/g, '');
    if(rawNumber.length < 8) {
      setAuthError('Por favor, informe um número de WhatsApp válido.');
      return;
    }
    const virtualEmail = `${rawNumber}@saaspro.internal`;

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, passwordStr);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: virtualEmail,
          whatsapp: whatsappStr,
          credits: 2, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, virtualEmail, passwordStr);
      }
      setShowAuthForm(false);
    } catch (error: any) {
      console.error('Auth operational failure:', error);
      if (error.code === 'auth/operation-not-allowed') {
         setAuthError('FALHA DE SISTEMA: O provedor de Email/Senha não está ativo no Firebase.');
      } else if (error.code === 'auth/email-already-in-use') {
         setAuthError('Este WhatsApp já está licenciado. Tente fazer Login.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
         setAuthError('Credenciais incorretas.');
      } else if (error.code === 'auth/weak-password') {
         setAuthError('A chave de acesso deve ter pelo menos 6 caracteres.');
      } else {
         setAuthError('Erro na autenticação. Verifique sua conexão.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const updateGrade = (index: number, field: string, value: string) => {
    setIsSaved(false);
    const newGrades = [...grades];
    (newGrades[index] as any)[field] = value;
    setGrades(newGrades);
    setTimeout(() => setIsSaved(true), 500);
  };

  const handleTextChange = (updater: (value: string) => void, value: string) => {
    setIsSaved(false);
    updater(value);
    setTimeout(() => setIsSaved(true), 500);
  };

  const deductCredit = async (): Promise<boolean> => {
    // ✅ Authenticated users (admin/developer) export without any credit cost
    if (isAdmin) return true;

    // ❌ Guest (client/end-user) must have credits to export
    if (guestCredits <= 0) {
      setShowRechargeModal(true);
      return false;
    }
    setGuestCredits(Math.max(0, guestCredits - 1));
    return true;
  };

  const handlePrint = async () => {
    const success = await deductCredit();
    if (success) {
      window.print();
    }
  };

  const downloadPDF = async () => {
    const success = await deductCredit();
    if (!success) return;

    if (!printAreaRef.current) return;
    setIsDownloading(true);
    
    try {
      // Import dynamically to optimize initial bundle size
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = printAreaRef.current;
      
      // Save current transform and enforce scale 1 for clear capture
      const originalTransform = element.style.transform;
      element.style.transform = 'scale(1)';
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Restore the scale so UI doesn't break
      element.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // A4 landscape dimensions: 297x210 mm
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      pdf.save('Certificado-Manus.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Verifique a sua ligação ou tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Drag and Drop Handlers for Grades
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedGradeIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.target instanceof HTMLElement) {
      setTimeout(() => e.target instanceof HTMLElement && e.target.classList.add('opacity-40', 'scale-[0.98]'), 0);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedGradeIdx(null);
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('opacity-40', 'scale-[0.98]');
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedGradeIdx === null || draggedGradeIdx === dropIndex) return;
    const newGrades = [...grades];
    const draggedItem = newGrades[draggedGradeIdx];
    newGrades.splice(draggedGradeIdx, 1);
    newGrades.splice(dropIndex, 0, draggedItem);
    setGrades(newGrades);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleReset = () => {
    if(window.confirm("Isso irá restaurar o modelo original de fábrica. Suas alterações na nuvem serão perdidas. Confirmar?")) {
      // Clear persistence and reload to trigger default values
      window.localStorage.clear();
      window.location.reload();
    }
  }

  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setLogoImg(event.target?.result as string);
      reader.readAsDataURL(file);
      setIsSaved(false);
    }
  };

  // Dynamic Smart Guide Logic
  const getHelperText = () => {
    switch(activeEditor) {
      case 'header': return { title: 'Logotipo & Escola', text: 'Altere o nome da instituição ou carregue o seu logotipo no botão superior.', icon: <ImageIcon className="w-5 h-5 text-[#d4af37]" /> };
      case 'title': return { title: 'Título Principal', text: 'Destaque o documento. Use letras MAIÚSCULAS para um visual mais formal.', icon: <Type className="w-5 h-5 text-[#d4af37]" /> };
      case 'body': return { title: 'Corpo do Texto', text: 'Selecione partes específicas do texto para aplicar Negrito, Itálico ou Sublinhado.', icon: <AlignLeft className="w-5 h-5 text-[#d4af37]" /> };
      case 'grades': return { title: 'Tabela de Avaliação', text: 'Altere os valores ou clique e arraste as linhas para reordenar a pauta.', icon: <List className="w-5 h-5 text-[#d4af37]" /> };
      default: return { title: 'Assistente Inteligente', text: 'Bem-vindo! Clique em qualquer texto do certificado abaixo para começar a editar.', icon: <Wand2 className="w-5 h-5 text-[#d4af37]" /> };
    }
  };
  const helper = getHelperText();

  return (
    <div className="min-h-screen bg-[#0b162c] flex flex-col font-sans selection:bg-[#d4af37] selection:text-[#0b162c]">
      
      {/* Header */}
      <header className="w-full bg-[#112344] border-b border-white/5 px-6 py-4 flex justify-between items-center z-[100] sticky top-0 no-print shadow-md">
         <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#d4af37] to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
              <Award className="w-5 h-5 text-[#0b162c]" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-lg leading-none tracking-tight uppercase flex items-center gap-2">
                Certificado <span className="text-[#d4af37]">Manus</span>
              </h1>
            </div>
         </div>
         
         <div className="flex gap-4 items-center">
            {isSaving && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md animate-pulse">
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tight">Salvando...</span>
              </div>
            )}
            {user && (
              <div className="flex items-center gap-3 bg-white/5 p-1 pl-4 rounded-xl border border-white/10">
                <div className="flex flex-col items-end">
                  <span className="text-white text-xs font-bold leading-none">{userData?.whatsapp || 'Admin'}</span>
                  <span className="text-green-400 text-[10px] font-black uppercase tracking-tighter mt-1 flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="#22c55e"/></svg>
                    Acesso Livre
                  </span>
                </div>
                <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors group" title="Sair">
                   <RotateCcw className="w-4 h-4 text-white/60 group-hover:text-red-400" />
                </button>
              </div>
            )}
          </div>
      </header>

      {/* Mobile Optimization Warning */}
      <div className="md:hidden w-full bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-start gap-3 z-50 no-print">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex flex-col">
          <span className="text-amber-500 font-bold text-[11px] uppercase tracking-wider mb-0.5">Recomendação de Uso</span>
          <span className="text-amber-200/90 text-[12px] leading-snug">
            A edição requer precisão. Recomendamos o uso de um <strong className="text-amber-400">Computador</strong>. A experiência no telemóvel pode ser limitada pelo tamanho do ecrã.
          </span>
        </div>
      </div>

      {/* Main App Workspace */}
      <div className="flex flex-col w-full flex-1 bg-gray-200 items-center pt-8 pb-8 relative shadow-[inset_0_10px_20px_rgba(0,0,0,0.3)] min-h-[800px]">
      
        {/* Main Editor Toolbar */}
        <div className="w-full max-w-[1123px] mx-auto bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200/60 rounded-2xl mb-8 z-40 no-print p-3 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 px-1 custom-scrollbar">
            {/* Branding/Status */}
            <div className="flex items-center gap-3 pr-4 border-r border-gray-200 shrink-0">
               <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-100 to-white flex items-center justify-center border border-gray-200 shadow-sm relative overflow-hidden">
                 <div className="absolute inset-0 bg-[#d4af37]/10 animate-pulse"></div>
                 <Wand2 className="w-4 h-4 text-[#112344] relative z-10"/>
               </div>
               <div className="flex flex-col">
                 <span className="font-extrabold text-[#112344] tracking-tight uppercase text-[11px] leading-tight">Ferramentas</span>
                 <span className="text-gray-400 text-[9px] font-bold tracking-widest uppercase">Editor Ativo</span>
               </div>
            </div>
            
            {/* Formatting Tools */}
            <div className="flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-xl shrink-0 border border-gray-100">
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-700 transition-all font-bold text-sm" title="Negrito (Ctrl+B)">B</button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-700 transition-all italic text-sm font-serif" title="Itálico (Ctrl+I)">I</button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-700 transition-all underline text-sm" title="Sublinhado">U</button>
              <div className="w-[1px] h-5 bg-gray-200 mx-1.5"></div>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('justifyLeft'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all" title="Alinhar à Esquerda"><AlignLeft className="w-4 h-4" /></button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('justifyCenter'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all" title="Centralizar"><AlignCenter className="w-4 h-4" /></button>
              <div className="w-[1px] h-5 bg-gray-200 mx-1.5"></div>
              {/* Font Size */}
              <select
                title="Tamanho da Letra"
                className="h-8 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-1 cursor-pointer focus:outline-none hover:border-[#d4af37] transition-colors"
                defaultValue=""
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => { execFormat('fontSize', e.target.value); e.target.value = ''; }}
              >
                <option value="" disabled>Tamanho</option>
                <option value="1">8px</option>
                <option value="2">10px</option>
                <option value="3">12px</option>
                <option value="4">14px</option>
                <option value="5">18px</option>
                <option value="6">24px</option>
                <option value="7">36px</option>
              </select>
              {/* Font Family */}
              <select
                title="Fonte"
                className="h-8 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-1 cursor-pointer focus:outline-none hover:border-[#d4af37] transition-colors max-w-[90px]"
                defaultValue=""
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => { execFormat('fontName', e.target.value); e.target.value = ''; }}
              >
                <option value="" disabled>Fonte</option>
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans-Serif</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial</option>
                <option value="Palatino Linotype">Palatino</option>
                <option value="Courier New">Monospace</option>
              </select>
              {/* Text Color */}
              <label className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all cursor-pointer relative" title="Cor do Texto">
                <span className="text-[13px] font-extrabold" style={{color:'#374151'}}>A</span>
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onInput={(e) => execFormat('foreColor', (e.target as HTMLInputElement).value)}
                />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-red-500 pointer-events-none"></div>
              </label>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-xl shrink-0 border border-gray-100">
              <button onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all hover:text-blue-600" title="Reduzir Zoom"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-[11px] font-bold text-gray-700 w-11 text-center select-none bg-white py-1 rounded shadow-inner">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all hover:text-blue-600" title="Aumentar Zoom"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setZoomLevel(1)} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-gray-500 transition-all ml-1.5 border-l border-gray-200 pl-2" title="Tamanho Padrão"><Maximize className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end px-2 md:px-0">
            {/* Save Status Indicator */}
            <div className="flex items-center">
              {isSaved ? (
                <div className="flex items-center gap-2 bg-green-50/80 px-3 py-1.5 rounded-full border border-green-200/60 shadow-sm transition-all duration-300">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></div>
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Salvo</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50/80 px-3 py-1.5 rounded-full border border-amber-200/60 shadow-sm transition-all duration-300">
                  <RotateCcw className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">A Salvar</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="text-gray-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-wider transition-colors px-2 py-2 hover:bg-red-50 rounded-lg">
                Restaurar
              </button>
              
              <button 
                onClick={downloadPDF} 
                disabled={isDownloading}
                className="bg-gradient-to-r from-[#112344] to-[#1a365d] hover:from-[#0b162c] hover:to-[#112344] text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_8px_20px_-6px_rgba(17,35,68,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(17,35,68,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 text-[#d4af37] animate-spin" /> : <Download className="w-4 h-4 text-[#d4af37] animate-bounce-subtle"/>}
                <span className="uppercase tracking-wide text-[10px] sm:text-[11px] whitespace-nowrap">{isDownloading ? 'A Gerar...' : 'Baixar PDF'}</span>
              </button>
              
              <button 
                onClick={handlePrint} 
                className="bg-white border border-gray-200 text-[#112344] font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                <Printer className="w-4 h-4 text-[#112344]"/>
                <span className="uppercase tracking-wide text-[10px] sm:text-[11px] whitespace-nowrap hidden sm:inline-block">Imprimir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Context Guide Wrapper (Absolute to prevent layout shift) */}
        <div className="absolute top-[85px] left-0 w-full flex justify-center z-50 pointer-events-none no-print [perspective:1000px]">
          <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform pointer-events-auto origin-top ${activeEditor ? 'opacity-100 translate-y-0 rotate-x-0 scale-100' : 'opacity-0 -translate-y-6 rotate-x-12 scale-95'}`}>
            <div className="bg-[#0b162c]/95 backdrop-blur-xl text-white px-5 py-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-[#d4af37]/20 flex items-start gap-4 max-w-[600px] mx-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-50"></div>
              
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4af37]/20 to-yellow-600/20 flex items-center justify-center shrink-0 border border-[#d4af37]/30 shadow-inner relative mt-0.5">
                <div className="absolute inset-0 bg-[#d4af37]/20 animate-ping rounded-full opacity-20"></div>
                {helper.icon}
              </div>
              
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-1.5">
                   <span className="font-black text-[#d4af37] text-[12px] uppercase tracking-widest flex items-center gap-2">
                     {helper.title}
                   </span>
                   {activeEditor === 'grades' && <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Drag & Drop</span>}
                </div>
                
                <span className="text-gray-200 text-[13px] leading-relaxed font-medium">{helper.text}</span>
                
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Atalhos:</span>
                   <kbd className="bg-white/10 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-mono hover:bg-white/20 transition-colors cursor-help">Ctrl+B</kbd>
                   <kbd className="bg-white/10 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-mono hover:bg-white/20 transition-colors cursor-help">Ctrl+I</kbd>
                   <kbd className="bg-white/10 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-mono hover:bg-white/20 transition-colors cursor-help">Ctrl+Z</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Preview Area */}
      <div 
        className="relative w-full overflow-visible flex justify-center custom-scrollbar"
        style={{ height: `${794 * certScale + 80}px` }}
      >
        
        {/* Certificate Container: Precise A4 Dimensions (1123px x 794px at 96 DPI) */}
        <div 
          id="print-area"
          ref={printAreaRef}
          className="relative bg-white shadow-2xl shrink-0 w-[1123px] h-[794px] overflow-hidden"
          style={{
            // Scale is computed via ResizeObserver for full cross-browser support
            transform: `scale(${certScale})`,
            transformOrigin: 'top center'
          }}
        >
          {/* Certificate SVG Background - Kept pristine */}
          <svg viewBox="0 0 1123 794" className="absolute inset-0 w-full h-full z-0 pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a63" />
                <stop offset="50%" stopColor="#14284b" />
                <stop offset="100%" stopColor="#0b162c" />
              </linearGradient>

              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c5a059" />
                <stop offset="20%" stopColor="#e8cf8c" />
                <stop offset="50%" stopColor="#9d7632" />
                <stop offset="80%" stopColor="#f5e1a4" />
                <stop offset="100%" stopColor="#8a6327" />
              </linearGradient>

              <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="2" dy="5" stdDeviation="5" floodOpacity="0.4" floodColor="#000" />
              </filter>
            </defs>

            {/* Paper Background */}
            <rect width="1123" height="794" fill="#f8f9fa" />

            {/* Inner Gold Border */}
            <rect x="35" y="35" width="1053" height="724" fill="none" stroke="url(#goldGrad)" strokeWidth="3" />

            {/* BOTTOM WAVES */}
            <g filter="url(#shadow)">
              {/* Back wave spans entire width and embeds behind the right corner ribbon base */}
              <path d="M7,710 C300,640 700,750 1116,720 L1116,787 L7,787 Z" fill="url(#navyGrad)" />
              <path d="M7,710 C300,640 700,750 1116,720" fill="none" stroke="url(#goldGrad)" strokeWidth="3.5" />
              
              {/* Front wave */}
              <path d="M7,745 C300,685 600,770 1116,750 L1116,787 L7,787 Z" fill="url(#navyGrad)" />
              <path d="M7,745 C300,685 600,770 1116,750" fill="none" stroke="url(#goldGrad)" strokeWidth="3" />
            </g>

            {/* TOP LEFT CORNER STYLE */}
            <g filter="url(#shadow)" transform="translate(7, 7) scale(0.7) translate(-7, -7)">
              {/* Inner Base Triangle */}
              <polygon points="7,7 150,7 7,150" fill="url(#navyGrad)" />
              <polygon points="150,7 156,7 7,156 7,150" fill="url(#goldGrad)" />
              
              {/* Diagonal Ribbon Overlay */}
              <polygon points="200,7 360,7 7,360 7,200" fill="url(#navyGrad)" />
              <polygon points="200,7 194,7 7,194 7,200" fill="url(#goldGrad)" />
              <polygon points="360,7 366,7 7,366 7,360" fill="url(#goldGrad)" />
            </g>

            {/* BOTTOM RIGHT CORNER STYLE */}
            <g filter="url(#shadow)" transform="translate(1116, 787) scale(0.7) translate(-1116, -787)">
              {/* Inner Base Triangle fully occupying the corner avoiding hollow waves */}
              <polygon points="1116,787 973,787 1116,644" fill="url(#navyGrad)" />
              <polygon points="973,787 967,787 1116,638 1116,644" fill="url(#goldGrad)" />
              
              {/* Diagonal Ribbon Overlay */}
              <polygon points="1116,419 1116,579 908,787 748,787" fill="url(#navyGrad)" />
              <polygon points="1116,419 1116,413 742,787 748,787" fill="url(#goldGrad)" />
              <polygon points="1116,579 1116,585 914,787 908,787" fill="url(#goldGrad)" />
            </g>

            {/* OUTER BLUE BORDER (Drawn last to cleanly clip edges and form sharp boundaries) */}
            <rect x="15" y="15" width="1093" height="764" fill="none" stroke="url(#navyGrad)" strokeWidth="16" />
            {/* INNER ACCENT */}
            <rect x="23" y="23" width="1077" height="748" fill="none" stroke="#2a456b" strokeWidth="1" />
          </svg>

          {/* Foreground Text Content */}
          <div className="absolute inset-0 z-10 flex flex-col pt-[45px] pb-[135px] px-[150px] text-[#4b5563] font-serif justify-between items-center">
            
            {/* Magnetic Snap Guide */}
            {snapGuide && (
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-blue-400/60 z-50 pointer-events-none no-print flex flex-col items-center justify-center">
                <div className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-sans font-bold shadow-sm whitespace-nowrap">Ao Centro</div>
              </div>
            )}

            {/* Header / Logo Section */}
            <DraggableBlock posKey="cert-pos-header" setSnapGuide={setSnapGuide}>
              <div className="flex w-full justify-center items-center gap-4">
                <div className="relative group w-[56px] h-[56px] flex items-center justify-center shrink-0 border-2 border-transparent hover:border-blue-400 hover:bg-blue-50/30 rounded cursor-pointer transition-all">
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleLogoUpload} title="Clique para alterar Logotipo" />
                  {logoImg ? (
                    <img src={logoImg} className="w-full h-full object-contain pointer-events-none" alt="Logo" />
                  ) : (
                    <svg viewBox="0 0 40 40" className="w-[85%] h-[85%] text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5">
                       <path d="M20,2 L38,20 L20,38 L2,20 Z" />
                       <path d="M28,10 L38,20 L28,30" stroke="white" strokeWidth="4" />
                    </svg>
                  )}
                  <div className="absolute -top-8 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Trocar Imagem</div>
                </div>

                <div className="flex flex-col font-sans uppercase -space-y-1 text-center items-center">
                  <ContentEditable html={logoText1} onChange={(v:any) => handleTextChange(setLogoText1, v)} onFocus={() => setActiveEditor('header')} onBlur={() => setActiveEditor(null)} className="text-[22px] font-medium tracking-wider text-[#374151] leading-tight block w-fit" />
                  <ContentEditable html={logoText2} onChange={(v:any) => handleTextChange(setLogoText2, v)} onFocus={() => setActiveEditor('header')} onBlur={() => setActiveEditor(null)} className="text-[26px] font-extrabold tracking-widest text-[#1e3a8a] leading-tight block w-fit" />
                </div>
              </div>
            </DraggableBlock>

            {/* Title */}
            <DraggableBlock posKey="cert-pos-title" setSnapGuide={setSnapGuide}>
              <div className="w-full mt-4 flex justify-center">
                <ContentEditable 
                  html={title} onChange={(v:any) => handleTextChange(setTitle, v)} onFocus={() => setActiveEditor('title')} onBlur={() => setActiveEditor(null)} as="h1"
                  className="text-[36px] font-bold text-center tracking-[0.1em] text-[#1b365d] uppercase border-b-2 border-[#d4af37] pb-1 px-8" 
                />
              </div>
            </DraggableBlock>

            {/* Body Paragraphs */}
            <div className="flex flex-col gap-2.5 text-[17px] text-center w-full max-w-[800px] mt-3 text-[#4b5563] leading-[1.4]">
              <DraggableBlock posKey="cert-pos-line1" setSnapGuide={setSnapGuide}><ContentEditable html={line1} onChange={(v:any) => handleTextChange(setLine1, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line2" setSnapGuide={setSnapGuide}><ContentEditable html={line2} onChange={(v:any) => handleTextChange(setLine2, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line3" setSnapGuide={setSnapGuide}><ContentEditable html={line3} onChange={(v:any) => handleTextChange(setLine3, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line4" setSnapGuide={setSnapGuide}><ContentEditable html={line4} onChange={(v:any) => handleTextChange(setLine4, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line5" setSnapGuide={setSnapGuide}><ContentEditable html={line5} onChange={(v:any) => handleTextChange(setLine5, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full font-semibold" /></DraggableBlock>
            </div>

            {/* Grades Table */}
            <DraggableBlock posKey="cert-pos-grades" setSnapGuide={setSnapGuide}>
              <div className="w-full max-w-[700px] mt-2 flex flex-col text-[16px] text-[#4b5563] bg-white/50 p-2 rounded">
                <div className="border-y-[1.5px] border-[#c0b171] py-[4px]">
                  {grades.map((g, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between items-end mb-2 w-full max-w-[600px] group/row transition-all"
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, i)}
                    >
                      <div className="opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing text-gray-300 hover:text-blue-500 mr-2 transition-opacity p-1 no-print">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                      </div>
                      <ContentEditable 
                        html={g.subject} 
                        onChange={(v: string) => updateGrade(i, 'subject', v)} 
                        onFocus={() => setActiveEditor('grades')}
                        onBlur={() => setActiveEditor(null)}
                        className="font-serif font-bold text-[14px] text-[#1a2f57] w-[140px] text-left" 
                      />
                      <div className="flex-1 border-b-[2px] border-dotted border-gray-400 mx-[4px] mb-[6px] opacity-70"></div>
                      <ContentEditable 
                        html={g.percent} 
                        onChange={(v: string) => updateGrade(i, 'percent', v)} 
                        onFocus={() => setActiveEditor('grades')}
                        onBlur={() => setActiveEditor(null)}
                        className="w-[60px] whitespace-nowrap text-left text-[#374151] font-semibold mr-3" 
                      />
                      <ContentEditable 
                        html={g.spell} 
                        onChange={(v: string) => updateGrade(i, 'spell', v)} 
                        onFocus={() => setActiveEditor('grades')}
                        onBlur={() => setActiveEditor(null)}
                        className="w-[200px] whitespace-nowrap text-left text-gray-600" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </DraggableBlock>

            {/* Footer / Signatures */}
            <div className="w-full max-w-[800px] flex justify-between px-10 items-end mt-4 relative z-20">
              {/* Left Signature */}
              <DraggableBlock posKey="cert-pos-sig1" setSnapGuide={setSnapGuide}>
                <div className="flex flex-col items-center w-64 pt-6 relative">
                  <ContentEditable html={sig1Name} onChange={(v:any) => handleTextChange(setSig1Name, v)} className="font-signature text-[42px] text-[#1a2f57] leading-[0.5] w-full text-center relative z-10" />
                  <div className="z-10 px-2 pt-2 pb-0 rounded w-full">
                    <div className="w-full border-b-[1.5px] border-[#1b365d] mb-1"></div>
                    <div className="flex flex-col items-center mt-1">
                      <ContentEditable html={sig1Role} onChange={(v:any) => handleTextChange(setSig1Role, v)} className="text-[14px] font-sans font-semibold text-gray-700 pt-0.5" />
                    </div>
                  </div>
                </div>
              </DraggableBlock>

              {/* Right Signature (Blank area for stamp and real ink signature) */}
              <DraggableBlock posKey="cert-pos-sig2" setSnapGuide={setSnapGuide}>
                <div className="flex flex-col items-center w-64 text-center relative pt-6 mt-10">
                  <div className="z-10 px-2 pt-2 pb-0 rounded w-full">
                    <div className="w-full border-b-[1.5px] border-[#1b365d] mb-1"></div>
                    {/* Text completely removed so physical stamp can be used here without overlapping digital text */}
                    <div className="h-[48px]"></div>
                  </div>
                </div>
              </DraggableBlock>
            </div>

          </div>
        </div>
      </div>


      {/* Auth Modal Overlay */}
      {showAuthForm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative slide-up-animation">
              <button onClick={() => setShowAuthForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1" title="Fechar">
                 <X className="w-5 h-5" />
              </button>
              <div className="p-8">
                 <h2 className="text-2xl font-bold text-[#112344] mb-2">Acesso ao Sistema</h2>
                 <p className="text-gray-500 text-sm mb-6">Insira suas credenciais para continuar.</p>
                 
                 <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    {authError && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold border border-red-100">{authError}</div>}
                    <input 
                      type="text" placeholder="WhatsApp" value={whatsappStr} onChange={(e) => setWhatsappStr(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#d4af37] transition-all outline-none text-sm"
                    />
                    <input 
                      type="password" placeholder="Senha" value={passwordStr} onChange={(e) => setPasswordStr(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#d4af37] transition-all outline-none text-sm"
                    />
                    <button type="submit" className="w-full bg-[#112344] text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 transition-transform active:scale-95">
                       {isRegistering ? 'Registrar Agora' : 'Entrar Agora'}
                    </button>
                    <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-blue-600 font-bold hover:underline py-1">
                       {isRegistering ? 'Já tenho conta' : 'Ainda não tenho conta'}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Créditos Esgotados */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
           <div className="bg-white w-full max-w-md rounded-[32px] p-10 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#d4af37] via-yellow-400 to-[#d4af37]"></div>
              <button onClick={() => setShowRechargeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1" title="Fechar">
                <X className="w-5 h-5" />
              </button>
              <div className="mb-6 w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-[#d4af37] ring-4 ring-amber-50">
                 <Award className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-[#112344] mb-3 leading-tight tracking-tight">Créditos Esgotados</h2>
              <p className="text-gray-600 mb-2 font-medium leading-relaxed text-sm">
                Para continuar a emitir certificados, entre em contacto via WhatsApp. Após confirmação do pagamento, os créditos são adicionados à sua conta.
              </p>
              <p className="text-gray-400 text-xs mb-8">Os créditos são adicionados manualmente após verificação do pagamento.</p>
              
              <div className="flex flex-col gap-3">
                <a 
                  href="https://wa.me/258879097249?text=Ol%C3%A1%21%20Quero%20obter%20cr%C3%A9ditos%20para%20o%20Certificado%20Manus." 
                  target="_blank" rel="noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-base"
                >
                   <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                   Pedir Créditos via WhatsApp
                </a>
                <a 
                  href="tel:+258879097249" 
                  className="w-full bg-[#112344] hover:bg-[#0b162c] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-base"
                >
                   <PhoneCall className="w-5 h-5" /> Ligar para Recarregar
                </a>
                {!user && (
                  <button
                    onClick={() => { setShowRechargeModal(false); setShowAuthForm(true); }}
                    className="text-blue-600 text-xs font-bold hover:underline py-2 transition-all"
                  >
                    Já fiz o pagamento — entrar com a minha conta
                  </button>
                )}
                <button onClick={() => setShowRechargeModal(false)} className="text-gray-400 text-xs py-1 hover:text-gray-600 transition-all">Fechar</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
           from { transform: translateY(20px); opacity: 0; }
           to { transform: translateY(0); opacity: 1; }
        }
        .slide-up-animation { animation: slideUp 0.4s ease-out forwards; }
      `}</style>
      </div> {/* App Workspace End */}
    </div>
  );
}
