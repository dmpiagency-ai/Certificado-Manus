/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
// Firebase imports removed — credit system is now fully local
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
  Move,
  Lock,
  LockOpen
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
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return; // Allow native browser undo/redo for text editing
      }
      e.preventDefault();
      if (e.shiftKey) redoHistory();
      else undoHistory();
    }
  });
  setTimeout(() => { if (historyStack.length === 0) saveHistorySnapshot(); }, 1000);
}

// Draggable + Resizable Block Wrapper (Adobe Illustrator Style)
const DraggableBlock = ({ children, posKey, defaultPos = { x: 0, y: 0 }, setSnapGuide, isLocked }: any) => {
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
      drag={isLocked ? false : true}
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
      onMouseEnter={() => !isLocked && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group outline-none transition-all flex justify-center ${
        !isLocked && isHovered ? 'ring-2 ring-dashed ring-[#d4af37]/60 bg-[#d4af37]/5' : ''
      } ${size.w ? '' : 'w-full'}`}
    >
      {/* Drag Handle (top center) */}
      {!isLocked && (
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-[#112344] rounded-md shadow-lg text-[#d4af37] z-50 cursor-grab active:cursor-grabbing hover:scale-110 no-print"
          onPointerDown={(e) => dragControls.start(e)}
          title="Arrastar livremente"
        >
          <Move className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Resize Handle (bottom right corner) */}
      {!isLocked && isHovered && (
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
      {!isLocked && isHovered && size.w && (
        <div className="absolute -top-3 right-0 text-[9px] font-mono text-[#d4af37]/80 bg-[#112344] px-1.5 py-0.5 rounded no-print">
          {Math.round(size.w)}px
        </div>
      )}

      <div style={{ width: '100%', overflowWrap: 'break-word' }}>
        {children}
      </div>
    </motion.div>
  );
};

const ContentEditable = ({ html, onChange, className = "", tagName = 'div', onFocus, onBlur, disabled }: any) => {
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
      contentEditable={!disabled}
      suppressContentEditableWarning
      className={`outline-none ${!disabled ? 'hover:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.9)] focus:bg-blue-50/30 rounded transition-all cursor-text' : ''} min-w-[20px] block md:inline-block ${className}`}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onInput={handleInput}
    />
  );
};

export default function App() {
  const [isSaved, setIsSaved] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [guestCredits, setGuestCredits] = useLocalStorage<number>('cert-guest-credits', 100);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeKeyInput, setRechargeKeyInput] = useState('');
  const [rechargeFeedback, setRechargeFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [quickInputText, setQuickInputText] = useState('');
  const [quickParseFeedback, setQuickParseFeedback] = useState('');
  // certScale is now derived from baseScale * zoomLevel
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [draggedGradeIdx, setDraggedGradeIdx] = useState<number | null>(null);
  const [snapGuide, setSnapGuide] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handleActivateRechargeKey = () => {
    setRechargeFeedback('');
    const key = rechargeKeyInput.trim().toUpperCase();
    if (key === 'MANUS2026' || key === 'RECARGA4' || key === 'MANUS4') {
      setGuestCredits(4);
      setRechargeFeedback('success');
      setTimeout(() => {
        setShowRechargeModal(false);
        setRechargeFeedback('');
        setRechargeKeyInput('');
      }, 1500);
    } else {
      setRechargeFeedback('error');
    }
  };

  const loadCurrentStudentData = () => {
    const text = `REPÚBLICA DE MOÇAMBIQUE
BILHETE DE IDENTIDADE
N°: 081404930288S
Nome / Name: ISSÁ DADE JÚNIOR
Data de Nascimento / Date of Birth: 25/03/2006
Naturalidade / Place of Birth: MOCUBA
Data de Emissão / Issuance Date: 14/11/2024
Nome do Pai / Father Name: ISSÁ DADE
Nome da Mãe / Mother Name: LEONILDE DA COSTA NOBRE DO ROSÁRIO
Sexo / Sex: M
Nível do curso: 5th
Curso: English
Data: 2026`;
    setQuickInputText(text);
    setQuickParseFeedback('Dados do aluno atual carregados. Clique em Analisar e Aplicar no Modelo.');
  };

  // Versioned cache reset — runs synchronously on first render, before useLocalStorage reads.
  // Bump CACHE_VERSION whenever default content changes to push new defaults to all users.
  useState(() => {
    const CACHE_VERSION = 'v99';
    if (typeof window !== 'undefined' && window.localStorage.getItem('cert-cache-version') !== CACHE_VERSION) {
      // Clear all cert keys except guest credits to do a full factory reset of the layout
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('cert-') && key !== 'cert-guest-credits') {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
      window.localStorage.setItem('cert-guest-credits', '100');
      window.localStorage.setItem('cert-cache-version', CACHE_VERSION);
    }
  });

  const [logoImg, setLogoImg] = useLocalStorage<string | null>('cert-logoImg', null);
  const [logoText1, setLogoText1] = useLocalStorage('cert-logoText1', 'COMUNIDADE');
  const [logoText2, setLogoText2] = useLocalStorage('cert-logoText2', 'DE LÍNGUAS');
  const [title, setTitle] = useLocalStorage('cert-title', 'CERTIFICATE');

   const [line1, setLine1] = useLocalStorage('cert-line1', '<strong>Efigénio Cardiga José Vuma</strong>, headmaster of Language Community School certifies that <strong style="white-space: nowrap; color: #374151;">ISSÁ DADE JÚNIOR</strong>');
    const [line2, setLine2] = useLocalStorage('cert-line2', 'Born on the 25<sup>th</sup> of March 2006 with ID Nr 081404930288S, issued on the 14<sup>th</sup> of November 2024 in Maputo City.');
   const [line3, setLine3] = useLocalStorage('cert-line3', 'Place of birth: Mocuba, Parents: ISSÁ DADE and LEONILDE DA COSTA NOBRE DO ROSÁRIO');
   const [line4, setLine4] = useLocalStorage('cert-line4', 'Concluded the 5<sup>th</sup> level of English Course in this institution, he was submitted to the final exams in 2026<br />(two thousand and twenty-six)');
   const [line5, setLine5] = useLocalStorage('cert-line5', 'Having got the following classification');

  useEffect(() => {
    if (line1.includes('Language Comunity School')) {
      setLine1(line1.replace('Language Comunity School', 'Language Community School'));
    }
  }, [line1, setLine1]);
  
  const [grades, setGrades] = useState([
    { subject: 'Writing', percent: '68 %', spell: 'Sixty eight percent' },
    { subject: 'Speaking', percent: '73 %', spell: 'Seventy three percent' },
    { subject: 'Average', percent: '71 %', spell: 'Seventy one percent' }
  ]);

  const [sig1Name, setSig1Name] = useLocalStorage('cert-sig1Name', '');
  const [sig1Role, setSig1Role] = useLocalStorage('cert-sig1Role', 'Academic department');
  const [sig2Name, setSig2Name] = useLocalStorage('cert-sig2Name', '<strong>Efigénio Cardiga José Vuma</strong>');
  const [sig2Role, setSig2Role] = useLocalStorage('cert-sig2Role', 'The headmaster');

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [whatsappStr, setWhatsappStr] = useState('');
  const [passwordStr, setPasswordStr] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!whatsappStr || !passwordStr) {
      setAuthError('Preencha todos os campos.');
      return;
    }
    setShowAuthForm(false);
  };

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
    setIsAppLoading(false);
  }, []);

  const updateGrade = (index: number, field: string, value: string) => {
    setIsSaved(false);
    const newGrades = [...grades];
    (newGrades[index] as any)[field] = value;
    setGrades(newGrades);
    setTimeout(() => setIsSaved(true), 500);
  };

  const readField = (text: string, aliases: string[]) => {
    const isBIField = aliases.some(a => a.toLowerCase() === 'bi' || a.toLowerCase() === 'n°' || a.toLowerCase() === 'nº');
    if (isBIField) {
      const nMatch = text.match(/(?:N°|nº)\s*:\s*([A-Z0-9]+)/i);
      if (nMatch?.[1]) return nMatch[1].trim();
    }

    for (const alias of aliases) {
      const variants = [alias];
      if (alias.includes('/')) {
        const parts = alias.split('/');
        variants.unshift(parts[0].trim());
        if (parts[1]?.trim()) variants.push(parts[1].trim());
      }

      for (const variant of variants) {
        const escapedAlias = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linePattern = new RegExp(`(?:^|\\n)\\s*${escapedAlias}(?:\\s*\\/\\s*[^:\\n]*)?\\s*[:=-]\\s*(.+)`, 'i');
        const globalPattern = new RegExp(`\\b${escapedAlias}(?:\\s*\\/\\s*[^:\\n]*)?\\s*[:=-]\\s*(.+)`, 'i');
        const match = text.match(linePattern) || text.match(globalPattern);
        if (match?.[1]) return match[1].trim();
      }
    }
    return '';
  };

  const formatDateForCertificate = (value: string, options: { abbr?: boolean } = {}) => {
    const trimmed = value.trim();
    // Handle full date format: DD/MM/YYYY or DD-MM-YYYY
    const fullMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    // Handle month/year format: MM/YYYY or MM-YYYY (for BI issuance date)
    const monthYearMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{4})$/);
    const months = options.abbr
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const getOrdinal = (day: number) => {
      const suffix = (day % 10 === 1 && day % 100 !== 11) ? 'st' : (day % 10 === 2 && day % 100 !== 12) ? 'nd' : (day % 10 === 3 && day % 100 !== 13) ? 'rd' : 'th';
      return `${day}<sup>${suffix}</sup>`;
    };

    if (fullMatch) {
      const day = parseInt(fullMatch[1], 10);
      const month = parseInt(fullMatch[2], 10);
      const year = fullMatch[3];
      if (month >= 1 && month <= 12) {
        return options.abbr
          ? `the ${getOrdinal(day)} ${months[month - 1]} ${year}`
          : `the ${getOrdinal(day)} of ${months[month - 1]} ${year}`;
      }
    }

    if (monthYearMatch) {
      const month = parseInt(monthYearMatch[1], 10);
      const year = monthYearMatch[2];
      if (month >= 1 && month <= 12) {
        return options.abbr
          ? `${months[month - 1]} ${year}`
          : `${months[month - 1]} ${year}`;
      }
    }

    if (/^the\s+/i.test(trimmed)) return trimmed;
    return `the ${trimmed}`;
  };

  const replaceInLine = (line: string, pattern: RegExp, replacement: string) => {
    return pattern.test(line) ? line.replace(pattern, replacement) : line;
  };

  const normalizeStoredCertificate = () => {
    let updatedLine1 = line1;
    let updatedLine2 = line2;
    let updatedLine3 = line3;
    let updatedLine4 = line4;
    let changed = false;

    if (/Language Comunity School/i.test(updatedLine1)) {
      updatedLine1 = updatedLine1.replace(/Language Comunity School/gi, 'Language Community School');
      changed = true;
    }
    if (/Certifies that/.test(updatedLine1)) {
      updatedLine1 = updatedLine1.replace(/Certifies that/g, 'certifies that');
      changed = true;
    }

    const bornMatch = updatedLine2.match(/Born on\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
    if (bornMatch) {
      const normalized = formatDateForCertificate(bornMatch[1]);
      updatedLine2 = updatedLine2.replace(bornMatch[1], normalized);
      changed = true;
    }

    const issuedMatch = updatedLine2.match(/Issued on\s+(.+?)\s*(In|in)/i);
    if (issuedMatch) {
      const normalized = formatDateForCertificate(issuedMatch[1], { abbr: true });
      updatedLine2 = updatedLine2.replace(issuedMatch[1], normalized);
      changed = true;
    }

    if (/Place of birth:.*province:\s*Maputo/i.test(updatedLine3)) {
      updatedLine3 = updatedLine3.replace(/province:\s*Maputo/i, 'province, Maputo.');
      changed = true;
    }

    if (changed) {
      setLine1(updatedLine1);
      setLine2(updatedLine2);
      setLine3(updatedLine3);
      setLine4(updatedLine4);
      setQuickParseFeedback('Modelo antigo detectado e atualizado para o formato atual.');
      setIsSaved(false);
    }
  };

  useEffect(() => {
    normalizeStoredCertificate();
  }, []);

  const applyQuickStudentData = () => {
    const raw = quickInputText.trim();
    if (!raw) {
      alert('Cole os dados do aluno para aplicar.');
      return;
    }

    const studentName = readField(raw, ['nome', 'name', 'aluno']);
    const birthDate = readField(raw, ['data de nascimento', 'date of birth', 'nascimento']);
    const biNumber = readField(raw, ['n°', 'nº', 'bi']);
    const biIssueDate = readField(raw, ['emissão', 'issuance date', 'emissao']);
    const birthPlace = readField(raw, ['naturalidade', 'place of birth']);
    const fatherName = readField(raw, ['nome do pai', 'father name', 'pai']);
    const motherName = readField(raw, ['nome da mãe', 'mother name', 'mãe', 'mae']);
    const courseLevel = readField(raw, ['nível do curso', 'level', 'nivel']);
    const courseName = readField(raw, ['curso']);
    const examDate = readField(raw, ['data', 'ano', 'exam year']);
    const sex = readField(raw, ['sexo', 'sex']);

    if (!studentName) {
      alert('Nao consegui identificar o nome do aluno. Use: Nome do aluno: ...');
      return;
    }

    let newLine1 = line1;
    let newLine2 = line2;
    let newLine3 = line3;
    let newLine4 = line4;

    if (studentName) {
      newLine1 = replaceInLine(
        newLine1,
        /Certifies that\s*<strong[^>]*>.*?<\/strong>/i,
        `Certifies that <strong style="white-space: nowrap; color: #374151;">${studentName}</strong>`
      );
    }

    const birthDateFormatted = birthDate ? formatDateForCertificate(birthDate) : '';
    const biIssueDateFormatted = biIssueDate ? formatDateForCertificate(biIssueDate) : '';

    if (birthDate) {
      newLine2 = newLine2.replace(/(Born on\s*)(.+?)(\s*(with\s+ID|with\b))/i, '$1' + birthDateFormatted + '$3');
      if (!newLine2.includes(birthDateFormatted)) {
        newLine2 = replaceInLine(newLine2, /Born on\s*.+/i, `Born on ${birthDateFormatted}`);
      }
    }
    if (biNumber) {
      newLine2 = replaceInLine(newLine2, /ID Nr\s*.+?\s*Issued/i, `ID Nr ${biNumber} Issued`);
    }
    if (biIssueDate) {
      newLine2 = replaceInLine(newLine2, /Issued on\s*.+?\s*(In|in)/i, `Issued on ${biIssueDateFormatted} In`);
    }

    if (birthPlace) {
      const formattedBirthPlace = birthPlace
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      newLine3 = replaceInLine(newLine3, /Place of birth:.*?Parents:/i, `Place of birth: ${formattedBirthPlace}, Parents:`);
    }

    if (fatherName || motherName) {
      const parentsMatch = newLine3.match(/Parents:\s*(.*?)\s*and\s*(.*)$/i);
      const currentFather = parentsMatch?.[1] || 'N/A';
      const currentMother = parentsMatch?.[2] || 'N/A';
      const updatedFather = fatherName || currentFather;
      const updatedMother = motherName || currentMother;
      newLine3 = replaceInLine(newLine3, /Parents:\s*.*$/i, `Parents: ${updatedFather} and ${updatedMother}`);
    }

    let pronoun = 'he';
    if (sex) {
      const s = sex.trim().toUpperCase();
      if (s === 'F' || s.startsWith('FEM') || s.startsWith('MUL') || s.includes('SEX: F')) {
        pronoun = 'she';
      } else if (s === 'M' || s.startsWith('MAS') || s.includes('SEX: M')) {
        pronoun = 'he';
      }
    } else {
      pronoun = newLine4.includes('she was') ? 'she' : newLine4.includes('he was') ? 'he' : 'she';
    }

    if (courseLevel) {
      let cleanLevel = courseLevel.trim();
      cleanLevel = cleanLevel.replace(/^(?:Concluded\s+the|Concluded|Concluiu\s+o|Concluiu\s+a|Concluiu)\s+/i, '');
      cleanLevel = cleanLevel.replace(/\s+(?:level|nível|nivel)$/i, '');
      
      if (/Concluded the\s*.+?\s*level\s+of/i.test(newLine4)) {
        newLine4 = replaceInLine(newLine4, /Concluded the\s*.+?\s*level\s+of/i, `Concluded the ${cleanLevel} level of`);
      } else if (/Concluded the\s*.+?\s*of\s+English/i.test(newLine4)) {
        newLine4 = replaceInLine(newLine4, /Concluded the\s*.+?\s*of\s+English/i, `Concluded the ${cleanLevel} of English`);
      } else {
        newLine4 = replaceInLine(newLine4, /Concluded the\s*.+?\s*(level\s+of|of)\s+English/i, `Concluded the ${cleanLevel} of English`);
      }
    }
    if (courseName) {
      if (/level of\s*.+?\s*Course/i.test(newLine4)) {
        newLine4 = replaceInLine(newLine4, /level of\s*.+?\s*Course/i, `level of ${courseName} Course`);
      } else if (/of\s*.+?\s*Course/i.test(newLine4)) {
        newLine4 = replaceInLine(newLine4, /of\s*.+?\s*Course/i, `of ${courseName} Course`);
      }
    }
    if (examDate) {
      let examYear = examDate.trim();
      const yearMatch = examYear.match(/\b\d{4}\b/);
      if (yearMatch) {
        examYear = yearMatch[0];
      }
      newLine4 = replaceInLine(newLine4, /final exams in\s*.*?\b\d{4}\b/i, `final exams in ${examYear}`);
    }
    newLine4 = replaceInLine(newLine4, /,\s*(she\/he|she|he)\s*was submitted to the final exams in/i, `, ${pronoun} was submitted to the final exams in`);

    setIsSaved(false);
    setLine1(newLine1);
    setLine2(newLine2);
    setLine3(newLine3);
    setLine4(newLine4);

    const foundFields = [
      !!studentName,
      !!birthDate,
      !!biNumber,
      !!biIssueDate,
      !!birthPlace,
      !!fatherName,
      !!motherName,
      !!courseLevel,
      !!courseName,
      !!examDate
    ].filter(Boolean).length;

    const validationIssues: string[] = [];
    if (studentName && !newLine1.includes(studentName)) validationIssues.push('Nome do aluno não foi aplicado corretamente.');
    if (birthDate && !newLine2.includes(birthDateFormatted)) validationIssues.push('Data de nascimento não foi aplicada corretamente.');
    if (biNumber && !newLine2.toLowerCase().includes(biNumber.toLowerCase())) validationIssues.push('BI não foi aplicado corretamente.');
    if (biIssueDate && !newLine2.includes(biIssueDateFormatted)) validationIssues.push('Data de emissão do BI não foi aplicada corretamente.');
    if (!newLine1.toLowerCase().includes('headmaster')) validationIssues.push('O contexto do modelo em line1 foi alterado.');
    if (!newLine1.includes('Language Community School')) validationIssues.push('O nome da escola não foi preservado.');
    if (!newLine2.toLowerCase().includes('born on')) validationIssues.push('A linha de nascimento perdeu o formato esperado.');
    if (!newLine2.toLowerCase().includes('id nr')) validationIssues.push('A linha do BI perdeu o identificador esperado.');
    if (!newLine2.toLowerCase().includes('issued on')) validationIssues.push('A linha de emissão perdeu o texto Issued on.');

    const summaryLines = [
      `Dados aplicados com sucesso. Campos reconhecidos: ${foundFields}/10.`,
      `Nome: ${studentName || 'não encontrado'}`,
      `Nascimento: ${birthDate || 'não encontrado'} => ${birthDateFormatted || 'não aplicado'}`,
      `BI: ${biNumber || 'não encontrado'}`,
      `Emissão BI: ${biIssueDate || 'não encontrado'} => ${biIssueDateFormatted || 'não aplicado'}`,
      `Naturalidade: ${birthPlace || 'não encontrado'}`,
      `Pai: ${fatherName || 'não encontrado'}`,
      `Mãe: ${motherName || 'não encontrado'}`,
      `Curso: ${courseLevel || 'não informado'} level of ${courseName || 'não informado'}`,
      `Ano de exame: ${examDate || 'não informado'}`
    ];
    if (validationIssues.length) {
      summaryLines.push('Atenção: ' + validationIssues.join(' | '));
    }

    setQuickParseFeedback(summaryLines.join('\n'));
    setTimeout(() => {
      setIsSaved(true);
      saveHistorySnapshot();
    }, 300);
  };

  const removeGrade = (index: number) => {
    if (grades.length <= 1) return;
    setIsSaved(false);
    setGrades(grades.filter((_, i) => i !== index));
    setTimeout(() => setIsSaved(true), 500);
  };

  const handleTextChange = (updater: (value: string) => void, value: string) => {
    setIsSaved(false);
    updater(value);
    setTimeout(() => setIsSaved(true), 500);
  };

  const deductCredit = async (): Promise<boolean> => {
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
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const element = printAreaRef.current;
      const originalTransform = element.style.transform;
      element.style.transform = 'scale(1)';

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1123,
        height: 794,
        windowWidth: 1123,
        windowHeight: 794,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      });

      element.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

      const matches = line1.match(/<strong[^>]*>(.*?)<\/strong>/gi);
      let studentName = 'Manus';
      if (matches && matches.length >= 2) {
        studentName = matches[1].replace(/<[^>]*>/g, '').trim();
      } else if (matches && matches.length === 1) {
        studentName = matches[0].replace(/<[^>]*>/g, '').trim();
      }

      const safeName = studentName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').substring(0, 30);
      pdf.save(`Certificado_${safeName}.pdf`);
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
    <div className="min-h-screen bg-gradient-to-br from-[#060c18] via-[#0b162c] to-[#0f2042] flex flex-col font-sans selection:bg-[#d4af37] selection:text-[#0b162c]">
      
      {/* Header */}
      <header className="w-full bg-[#0b162c]/85 backdrop-blur-md border-b border-[#d4af37]/20 px-6 py-4 flex justify-between items-center z-[100] sticky top-0 no-print shadow-md">
         <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#d4af37] to-yellow-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-[#d4af37]/30">
              <Award className="w-5 h-5 text-[#0b162c]" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-lg leading-none tracking-tight uppercase flex items-center gap-2">
                Certificado <span className="text-[#d4af37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">Manus</span>
              </h1>
            </div>
         </div>
         
         <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
                  isLocked 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)]' 
                    : 'bg-gradient-to-r from-[#d4af37] to-amber-500 hover:from-[#e5c158] hover:to-amber-600 text-[#0b162c] shadow-[0_4px_14px_rgba(212,175,55,0.4)] animate-pulse'
                }`}
                title={isLocked ? "Desbloquear para editar" : "Bloquear e ver Preview"}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                {isLocked ? 'Modo Preview (Bloqueado)' : 'Modo Edição (Livre)'}
              </button>

              <div className="h-8 w-px bg-white/10 mx-1"></div>
              
              <div 
                onClick={() => setShowRechargeModal(true)}
                className="flex items-center bg-white/5 hover:bg-white/10 cursor-pointer px-3.5 py-2 rounded-xl border border-white/10 hover:border-[#d4af37]/40 shadow-md transition-all active:scale-95 group"
                title="Clique para Recarregar"
              >
                <span className="text-[10px] uppercase font-black text-white/60 mr-2.5 tracking-widest group-hover:text-[#d4af37] transition-colors">Créditos</span>
                <span className="text-sm font-black text-[#d4af37] mr-2 bg-[#0b162c] px-2 py-0.5 rounded-md border border-[#d4af37]/30">
                   {guestCredits} / 4
                </span>
                <span className="text-[10px] uppercase font-black text-[#0b162c] bg-gradient-to-r from-[#d4af37] to-amber-500 px-2 py-0.5 rounded-md transition-all hover:scale-105">
                   Recarregar
                </span>
              </div>
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
      <div className="flex flex-col w-full flex-1 bg-[#090f1d] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_50%)] items-center pt-8 pb-8 relative shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)] min-h-[800px]">
      
        {/* Main Editor Toolbar */}
        <div className="w-full max-w-[1123px] mx-auto bg-[#112344]/90 backdrop-blur-xl shadow-2xl border border-white/10 rounded-2xl mb-8 z-40 no-print p-2.5 flex flex-col lg:flex-row items-center justify-between gap-3 transition-all hover:border-[#d4af37]/30 shadow-black/40 hover:shadow-[#d4af37]/5">
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 px-1 custom-scrollbar scrollbar-hide">
            {/* Branding/Status */}
            <div className="flex items-center gap-3 pr-3 border-r border-white/10 shrink-0">
               <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shadow-sm relative overflow-hidden shrink-0">
                 <div className="absolute inset-0 bg-[#d4af37]/10 animate-pulse"></div>
                 <Wand2 className="w-3.5 h-3.5 text-[#d4af37] relative z-10"/>
               </div>
               <div className="flex flex-col">
                 <span className="font-extrabold text-white tracking-tight uppercase text-[10px] leading-tight">Ferramentas</span>
                 <span className="text-white/40 text-[8px] font-bold tracking-widest uppercase">Editor Ativo</span>
               </div>
            </div>
            
            {/* Formatting Tools */}
            <div className="flex items-center gap-0.5 bg-[#0b162c]/60 p-1 rounded-lg shrink-0 border border-white/5">
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 hover:text-white rounded text-white/80 transition-all font-bold text-sm" title="Negrito (Ctrl+B)">B</button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 hover:text-white rounded text-white/80 transition-all italic text-sm font-serif" title="Itálico (Ctrl+I)">I</button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 hover:text-white rounded text-white/80 transition-all underline text-sm" title="Sublinhado">U</button>
              <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('justifyLeft'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 hover:text-white rounded text-white/80 transition-all" title="Alinhar à Esquerda"><AlignLeft className="w-4 h-4" /></button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('justifyCenter'); }} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 hover:text-white rounded text-white/80 transition-all" title="Centralizar"><AlignCenter className="w-4 h-4" /></button>
              <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
              
              {/* Font Controls Group */}
              <div className="flex items-center gap-1.5 px-1">
                <select
                  title="Tamanho da Letra"
                  className="h-7 text-[10px] font-bold text-white bg-[#0b162c] border border-white/10 rounded px-1 cursor-pointer focus:outline-none hover:border-[#d4af37] transition-colors focus:ring-1 focus:ring-[#d4af37]"
                  defaultValue=""
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => { execFormat('fontSize', e.target.value); e.target.value = ''; }}
                >
                  <option value="" disabled className="text-white/40">Tam.</option>
                  <option value="1" className="text-white bg-[#0b162c]">8px</option>
                  <option value="2" className="text-white bg-[#0b162c]">10px</option>
                  <option value="3" className="text-white bg-[#0b162c]">12px</option>
                  <option value="4" className="text-white bg-[#0b162c]">14px</option>
                  <option value="5" className="text-white bg-[#0b162c]">18px</option>
                  <option value="6" className="text-white bg-[#0b162c]">24px</option>
                  <option value="7" className="text-white bg-[#0b162c]">36px</option>
                </select>
                <select
                  title="Fonte"
                  className="h-7 text-[10px] font-bold text-white bg-[#0b162c] border border-white/10 rounded px-1 cursor-pointer focus:outline-none hover:border-[#d4af37] transition-colors max-w-[80px] focus:ring-1 focus:ring-[#d4af37]"
                  defaultValue=""
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => { execFormat('fontName', e.target.value); e.target.value = ''; }}
                >
                  <option value="" disabled className="text-white/40">Fonte</option>
                  <option value="serif" className="text-white bg-[#0b162c]">Serif</option>
                  <option value="sans-serif" className="text-white bg-[#0b162c]">Sans-Serif</option>
                  <option value="Georgia" className="text-white bg-[#0b162c]">Georgia</option>
                  <option value="Times New Roman" className="text-white bg-[#0b162c]">Times New Roman</option>
                  <option value="Arial" className="text-white bg-[#0b162c]">Arial</option>
                  <option value="Palatino Linotype" className="text-white bg-[#0b162c]">Palatino</option>
                  <option value="Courier New" className="text-white bg-[#0b162c]">Monospace</option>
                </select>
                <label className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded text-white/80 transition-all cursor-pointer relative" title="Cor do Texto">
                  <span className="text-[11px] font-extrabold text-[#d4af37]">A</span>
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onInput={(e) => execFormat('foreColor', (e.target as HTMLInputElement).value)}
                  />
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-[2px] rounded-full bg-red-500 pointer-events-none"></div>
                </label>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-[#0b162c]/60 p-1 rounded-lg shrink-0 border border-white/5">
              <button onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.1))} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded text-white/70 transition-all hover:text-[#d4af37]" title="Reduzir Zoom"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="text-[10px] font-bold text-white/90 w-9 text-center select-none">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded text-white/70 transition-all hover:text-[#d4af37]" title="Aumentar Zoom"><ZoomIn className="w-3.5 h-3.5" /></button>
              <button onClick={() => setZoomLevel(1)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded text-white/40 transition-all ml-0.5 border-l border-white/10 pl-1 hover:text-[#d4af37]" title="Tamanho Padrão"><Maximize className="w-3 h-3" /></button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end px-1 lg:px-0">
            {/* Save Status Indicator */}
            <div className="flex items-center shrink-0">
              {isSaved ? (
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 shadow-sm transition-all duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse"></div>
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">Salvo</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 shadow-sm transition-all duration-300">
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Gravando</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={handleReset} className="text-white/40 hover:text-red-400 text-[9px] font-black uppercase tracking-widest transition-colors px-2.5 py-2 hover:bg-red-500/10 rounded-lg shrink-0">
                Reset
              </button>
              
              <button 
                onClick={downloadPDF} 
                disabled={isDownloading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-600 text-white font-black px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#d4af37]"/>}
                <span className="uppercase tracking-widest text-[10px] whitespace-nowrap">Baixar</span>
              </button>
              
              <button 
                onClick={handlePrint} 
                className="bg-white/5 border border-white/10 text-white font-black px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 shrink-0"
              >
                <Printer className="w-3.5 h-3.5 text-[#d4af37]"/>
                <span className="uppercase tracking-widest text-[10px] whitespace-nowrap hidden sm:inline-block">PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Student Fill Panel */}
        <div className="w-full max-w-[1123px] mx-auto mb-5 no-print">
          {!showQuickFill ? (
            <div className="flex justify-end">
              <button
                onClick={() => setShowQuickFill(true)}
                className="bg-white/95 border border-gray-200 text-[#112344] font-bold text-[11px] px-3 py-2 rounded-xl shadow-sm hover:bg-white transition-colors flex items-center gap-2"
              >
                <Info className="w-4 h-4 text-blue-600" />
                Funcionalidade: Preenchimento Rapido
              </button>
            </div>
          ) : (
            <div className="bg-white/95 border border-gray-200 rounded-2xl shadow-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#112344]">Preenchimento Rapido do Aluno</span>
                </div>
                <button
                  onClick={() => setShowQuickFill(false)}
                  className="text-[10px] font-bold text-gray-500 hover:text-[#112344] px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  Cole os dados em texto livre e o sistema atualiza apenas os dados do aluno no certificado, sem alterar o layout ou o resto do modelo.
                  <span className="font-semibold text-gray-800"> Exemplo:</span> Nome do aluno: ..., BI: ..., Nome do pai: ...
                </p>
                <textarea
                  value={quickInputText}
                  onChange={(e) => setQuickInputText(e.target.value)}
                  placeholder={`REPÚBLICA DE MOÇAMBIQUE
Dados do BI:
N°: 110104531919M
Nome / Name: Maria Das Dores
Data de Nascimento / Date of Birth: 09/03/2006
Naturalidade / Place of Birth: Beira
Emissão / Issuance Date: 18/08/2022
Nome do Pai / Father Name: Marcelino Mussa
Nome da Mãe / Mother Name: Estrela Custavo Vilanculo
Nível do curso / Level: 5th
Curso / Course: English
Ano de Exame / Data: 2026`}
                  className="w-full min-h-[170px] px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono leading-relaxed"
                />
                {quickParseFeedback && (
                  <div className="whitespace-pre-wrap text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    {quickParseFeedback}
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2 mt-1">
                  <button
                    onClick={loadCurrentStudentData}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95"
                  >
                    Carregar dados do aluno
                  </button>
                  <button
                    onClick={applyQuickStudentData}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95"
                  >
                    Analisar e Aplicar no Modelo
                  </button>
                </div>
              </div>
            </div>
          )}
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
                <stop offset="0%" stopColor="#002D72" />
                <stop offset="50%" stopColor="#004FB0" />
                <stop offset="100%" stopColor="#00184A" />
              </linearGradient>

              {/* Royal Gold Gradient */}
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="25%" stopColor="#FFDF73" />
                <stop offset="50%" stopColor="#DAA520" />
                <stop offset="75%" stopColor="#FFF2A8" />
                <stop offset="100%" stopColor="#B8860B" />
              </linearGradient>

              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="3" dy="5" stdDeviation="8" floodOpacity="0.4" floodColor="#000000" />
              </filter>
            </defs>

            {/* Paper Background */}
            <rect width="1123" height="794" fill="#f8f9fa" />

            {/* Inner Gold Border */}
            <rect x="35" y="35" width="1053" height="724" fill="none" stroke="url(#goldGrad)" strokeWidth="3" />

            {/* BOTTOM WAVES */}
            <g filter="url(#shadow)">
              {/* Back wave (Top-most curve) */}
              <path d="M7,730 C200,730 400,680 560,680 C720,680 900,760 1116,710 L1116,787 L7,787 Z" fill="url(#navyGrad)" />
              <path d="M7,730 C200,730 400,680 560,680 C720,680 900,760 1116,710" fill="none" stroke="url(#goldGrad)" strokeWidth="3.5" />
              
              {/* Middle wave */}
              <path d="M7,755 C200,755 400,705 560,705 C720,705 900,775 1116,735 L1116,787 L7,787 Z" fill="url(#navyGrad)" />
              <path d="M7,755 C200,755 400,705 560,705 C720,705 900,775 1116,735" fill="none" stroke="url(#goldGrad)" strokeWidth="3.5" />
              
              {/* Front wave (Rising from bottom edge) */}
              <path d="M120,787 C280,750 420,730 560,730 C720,730 900,790 1116,760 L1116,787 Z" fill="url(#navyGrad)" />
              <path d="M120,787 C280,750 420,730 560,730 C720,730 900,790 1116,760" fill="none" stroke="url(#goldGrad)" strokeWidth="3" />
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
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-[#60a5fa]/60 z-50 pointer-events-none no-print flex flex-col items-center justify-center">
                <div className="bg-[#3b82f6] text-[#ffffff] text-[10px] px-2 py-0.5 rounded-full font-sans font-bold shadow-sm whitespace-nowrap">Ao Centro</div>
              </div>
            )}

            {/* Header / Logo Section */}
            <DraggableBlock posKey="cert-pos-header" setSnapGuide={setSnapGuide} isLocked={isLocked}>
              <div className="relative group flex items-center justify-center py-2 px-4 border-2 border-transparent hover:border-[#60a5fa] hover:bg-[#eff6ff]/30 rounded cursor-pointer transition-all">
                {/* Unified File Input */}
                {!isLocked && (
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-30" onChange={handleLogoUpload} title="Carregar Logotipo" />
                )}

                {logoImg ? (
                  <img src={logoImg} className="max-h-[75px] w-auto object-contain pointer-events-none z-10" alt="Logo" />
                ) : (
                  <div className="flex items-center pointer-events-auto z-20">
                    {/* Pixel-Perfect Logo Icon (Rounded Bracket-C) */}
                    <div className="w-[50px] h-[50px] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 40 40" className="w-full h-full text-[#1b365d]" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M28,8 L18,2 L2,20 L18,38 L28,32" />
                      </svg>
                    </div>

                    {/* Thin Vertical Separator - Bolder and Closer */}
                    <div className="w-[3.5px] h-9 bg-[#1b365d] opacity-100 ml-[-8px] mr-[10px]"></div>

                    {/* Balanced Typography Block */}
                    <div className="flex flex-col font-sans uppercase -space-y-2 items-start text-left">
                      <ContentEditable html={logoText1} onChange={(v:any) => handleTextChange(setLogoText1, v)} onFocus={() => setActiveEditor('header')} onBlur={() => setActiveEditor(null)} className="text-[20px] font-extrabold text-[#1b365d] tracking-[-0.03em]" disabled={isLocked} />
                      <ContentEditable html={logoText2} onChange={(v:any) => handleTextChange(setLogoText2, v)} onFocus={() => setActiveEditor('header')} onBlur={() => setActiveEditor(null)} className="text-[21.5px] font-extrabold text-[#1b365d] tracking-[0.02em]" disabled={isLocked} />
                    </div>
                  </div>
                )}

                {!isLocked && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#000000]/80 text-[#ffffff] text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-40">
                    Substituir por Imagem
                  </div>
                )}
              </div>
            </DraggableBlock>

            {/* Title */}
            <DraggableBlock posKey="cert-pos-title" setSnapGuide={setSnapGuide} isLocked={isLocked}>
              <div className="w-full mt-4 flex justify-center">
                <ContentEditable 
                  html={title} onChange={(v:any) => handleTextChange(setTitle, v)} onFocus={() => setActiveEditor('title')} onBlur={() => setActiveEditor(null)} as="h1"
                  className="text-[36px] font-bold text-center tracking-[0.1em] text-[#1b365d] uppercase" 
                  disabled={isLocked}
                />
              </div>
            </DraggableBlock>

            {/* Body Paragraphs */}
            <div 
              className="flex flex-col gap-2.5 text-[17px] text-center w-full max-w-[900px] mt-3 text-[#4b5563] leading-[1.6]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <DraggableBlock posKey="cert-pos-line1" setSnapGuide={setSnapGuide} isLocked={isLocked}><ContentEditable html={line1} onChange={(v:any) => handleTextChange(setLine1, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" disabled={isLocked} /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line2" setSnapGuide={setSnapGuide} isLocked={isLocked}><ContentEditable html={line2} onChange={(v:any) => handleTextChange(setLine2, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" disabled={isLocked} /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line3" setSnapGuide={setSnapGuide} isLocked={isLocked}><ContentEditable html={line3} onChange={(v:any) => handleTextChange(setLine3, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" disabled={isLocked} /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line4" setSnapGuide={setSnapGuide} isLocked={isLocked}><ContentEditable html={line4} onChange={(v:any) => handleTextChange(setLine4, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full" disabled={isLocked} /></DraggableBlock>
              <DraggableBlock posKey="cert-pos-line5" setSnapGuide={setSnapGuide} isLocked={isLocked}><ContentEditable html={line5} onChange={(v:any) => handleTextChange(setLine5, v)} onFocus={() => setActiveEditor('body')} onBlur={() => setActiveEditor(null)} className="w-full font-bold text-[#1b365d]" disabled={isLocked} /></DraggableBlock>
            </div>

            {/* Grades Table */}
            <DraggableBlock posKey="cert-pos-grades" setSnapGuide={setSnapGuide} isLocked={isLocked}>
              <div 
                className="w-full max-w-[950px] mt-3 flex flex-col text-[16px] text-[#4b5563] bg-[#ffffff]/50 p-1.5 rounded"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <div className="border-y-[1.5px] border-[#1b365d] flex flex-col w-full">
                  {grades.map((g, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-row items-center justify-between w-full group/row transition-all relative py-1.5 px-4 ${
                        i === 1 ? 'bg-[#dbeafe] border-y-[1.5px] border-[#1b365d]' : ''
                      }`}
                      draggable={!isLocked}
                      onDragStart={(e) => !isLocked && handleDragStart(e, i)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => !isLocked && handleDrop(e, i)}
                    >
                      <div className={`absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing text-[#d1d5db] hover:text-[#3b82f6] transition-opacity p-1 no-print ${isLocked ? 'hidden' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                      </div>

                      <ContentEditable 
                        html={g.subject} 
                        onChange={(v: string) => updateGrade(i, 'subject', v)} 
                        onFocus={() => setActiveEditor('grades')}
                        onBlur={() => setActiveEditor(null)}
                        className="font-bold text-[15px] text-[#1a2f57] w-[140px] text-left uppercase tracking-wider" 
                        disabled={isLocked}
                      />

                      <div className="flex-1 border-b-[2px] border-dotted border-[#1b365d]/60 mx-2 mb-[4px] opacity-70"></div>

                      <div className="flex items-center gap-6 text-left w-[320px]">
                        <ContentEditable 
                          html={g.percent} 
                          onChange={(v: string) => updateGrade(i, 'percent', v)} 
                          onFocus={() => setActiveEditor('grades')}
                          onBlur={() => setActiveEditor(null)}
                          className="w-[50px] whitespace-nowrap text-right text-[#1a2f57] font-bold" 
                          disabled={isLocked}
                        />
                        <ContentEditable 
                          html={g.spell} 
                          onChange={(v: string) => updateGrade(i, 'spell', v)} 
                          onFocus={() => setActiveEditor('grades')}
                          onBlur={() => setActiveEditor(null)}
                          className="flex-1 whitespace-nowrap text-left text-[#1a2f57] font-bold" 
                          disabled={isLocked}
                        />
                      </div>

                      {!isLocked && (
                        <button onClick={() => removeGrade(i)} className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 text-red-300 hover:text-red-500 transition-opacity no-print">
                           <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  

                </div>
              </div>
            </DraggableBlock>

            {/* Footer / Signatures */}
            <div className="w-full max-w-[800px] flex justify-between px-10 items-start mt-2 relative z-20">
              {/* Left Signature */}
              <DraggableBlock posKey="cert-pos-sig1" setSnapGuide={setSnapGuide} isLocked={isLocked}>
                <div className="flex flex-col items-center w-64 pt-6 relative">
                  <div className="z-10 px-2 pt-2 pb-0 rounded w-full">
                    <div className="w-full border-b-[1.5px] border-[#1b365d] mb-1"></div>
                    <div className="flex flex-col items-center mt-1">
                      <ContentEditable html={sig1Name} onChange={(v:any) => handleTextChange(setSig1Name, v)} className="text-[14px] font-sans font-bold text-[#374151] pt-0.5" disabled={isLocked} />
                      <ContentEditable html={sig1Role} onChange={(v:any) => handleTextChange(setSig1Role, v)} className="text-[14px] font-sans font-semibold text-[#374151] pt-0.5" disabled={isLocked} />
                    </div>
                  </div>
                </div>
              </DraggableBlock>

              {/* Right Signature */}
              <DraggableBlock posKey="cert-pos-sig2" setSnapGuide={setSnapGuide} isLocked={isLocked}>
                <div className="flex flex-col items-center w-64 text-center relative pt-6">
                  <div className="z-10 px-2 pt-2 pb-0 rounded w-full">
                    <div className="w-full border-b-[1.5px] border-[#1b365d] mb-1"></div>
                    <div className="flex flex-col items-center mt-1">
                      <ContentEditable html={sig2Name} onChange={(v:any) => handleTextChange(setSig2Name, v)} className="text-[14px] font-sans font-bold text-[#374151] pt-0.5" disabled={isLocked} />
                      <ContentEditable html={sig2Role} onChange={(v:any) => handleTextChange(setSig2Role, v)} className="text-[14px] font-sans font-semibold text-[#374151] pt-0.5" disabled={isLocked} />
                    </div>
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
                Para continuar a emitir certificados, efectue o pagamento e envie o comprovativo para receber a sua Chave de Recarga de +4 créditos.
              </p>
              <p className="text-gray-400 text-xs mb-8">O saldo é actualizado inserindo o código secreto fornecido.</p>
              
              <div className="flex flex-col gap-3">
                <a 
                  href="https://wa.me/258879097249?text=Ol%C3%A1%21%20Efectuei%20o%20pagamento%20e%20gostaria%20de%20receber%20a%20minha%20Chave%20de%20Recarga%20de%20cr%C3%A9ditos%20para%20o%20Certificado%20Manus." 
                  target="_blank" rel="noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-base"
                >
                   <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                   Pedir Chave via WhatsApp
                </a>
                
                <div className="mt-6 border-t border-gray-100 pt-6 text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Inserir Chave de Recarga
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rechargeKeyInput}
                      onChange={(e) => setRechargeKeyInput(e.target.value)}
                      placeholder="Cole a chave de 4 créditos"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#d4af37] transition-all outline-none text-sm font-mono uppercase text-center"
                    />
                    <button
                      onClick={handleActivateRechargeKey}
                      className="bg-[#112344] hover:bg-[#0b162c] text-white font-bold px-4 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                      Activar
                    </button>
                  </div>
                  {rechargeFeedback === 'success' && (
                    <div className="text-xs text-emerald-600 font-bold mt-2 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100 animate-pulse">
                       Sucesso! +4 créditos activados com sucesso.
                    </div>
                  )}
                  {rechargeFeedback === 'error' && (
                    <div className="text-xs text-red-500 font-bold mt-2 bg-red-50 py-1.5 px-3 rounded-lg border border-red-100">
                       Chave inválida. Fale com o fornecedor.
                    </div>
                  )}
                </div>

                <button onClick={() => setShowRechargeModal(false)} className="text-gray-400 text-xs py-1 mt-4 hover:text-gray-600 transition-all">Fechar</button>
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
