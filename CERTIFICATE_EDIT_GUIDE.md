# Manual de Instruções: Atualização de Alunos no Certificado

> **PROTOCOLO DE TOLERÂNCIA ZERO A ERROS**: Este documento é a fonte de verdade absoluta para o preenchimento, validação e atualização de dados dos certificados da **Language Community School**. Nenhuma alteração nas lógicas internas do código (React, SVG, CSS, engine de renderização ou exportação) deve ser feita. Apenas a injeção estrita e padronizada dos dados do aluno.

---

## 🛡️ Regras Fundamentais e Inegociáveis (Design System & Dados)

### 1. Nome do Aluno
* **Formato**: CAIXA ALTA rigorosa, respeitando todos os acentos originais do BI (ex: `ISSÁ DADE JÚNIOR`, `PLÍNIA DA CONCEIÇÃO JOÃO SIQUICE`, `WAGNER JULINO NHATSAVE`).
* **Tag Obrigatória de Estilo**: O nome na `line1` deve SEMPRE estar encapsulado por:
  ```html
  <strong style="white-space: nowrap; color: #374151;">NOME_DO_ALUNO</strong>
  ```
  *(O `white-space: nowrap;` impede que o nome do aluno quebre de forma deselegante).*

---

### 2. Número do Bilhete de Identidade (BI)
* **Formato**: Exatamente 13 caracteres (12 dígitos seguidos de 1 letra maiúscula).
* **Exemplos**: `110104531919M`, `081404930288S`, `081408872761J`.
* Nunca insira espaços ou traços no número do BI.

---

### 3. Datas e Sufixos Ordinais (`<sup>...</sup>`)
Todas as datas do corpo do certificado são escritas no padrão formal em inglês:
`Born on the [DIA]<sup>[SUFIXO]</sup> of [MÊS_EM_INGLÊS] [ANO]` e `issued on the [DIA]<sup>[SUFIXO]</sup> of [MÊS_EM_INGLÊS] [ANO]`.

#### Tabela Canônica de Sufixos Ordinais:
| Dias do Mês | Sufixo HTML | Exemplos Práticos |
| :--- | :--- | :--- |
| Termina em **1** (exceto 11) | `<sup>st</sup>` | `1<sup>st</sup>`, `21<sup>st</sup>`, `31<sup>st</sup>` |
| Termina em **2** (exceto 12) | `<sup>nd</sup>` | `2<sup>nd</sup>`, `22<sup>nd</sup>` |
| Termina em **3** (exceto 13) | `<sup>rd</sup>` | `3<sup>rd</sup>`, `23<sup>rd</sup>` |
| 11, 12, 13 e todos os demais | `<sup>th</sup>` | `4<sup>th</sup>`, `6<sup>th</sup>`, `11<sup>th</sup>`, `12<sup>th</sup>`, `13<sup>th</sup>`, `15<sup>th</sup>`, `30<sup>th</sup>` |

#### Tabela de Meses em Inglês:
* `01` ➡️ `January`
* `02` ➡️ `February`
* `03` ➡️ `March`
* `04` ➡️ `April`
* `05` ➡️ `May`
* `06` ➡️ `June`
* `07` ➡️ `July`
* `08` ➡️ `August`
* `09` ➡️ `September`
* `10` ➡️ `October`
* `11` ➡️ `November`
* `12` ➡️ `December`

---

### 4. Local de Emissão (Regra da Cidade com "City")
* **REGRA OBRIGATÓRIA**: Cidades moçambicanas de emissão devem SEMPRE vir acompanhadas do sufixo **`City`** em inglês.
  * `CIDADE DE MAPUTO` ou `MAPUTO` ➡️ **`Maputo City`** *(NUNCA deixar apenas "Maputo")*
  * `CIDADE DE INHAMBANE` ou `INHAMBANE` ➡️ **`Inhambane City`**
  * `CIDADE DA MATOLA` ou `MATOLA` ➡️ **`Matola City`**
  * `CIDADE DA BEIRA` ou `BEIRA` ➡️ **`Beira City`**
* **Texto final na `line2`**: `... in Maputo City.`

---

### 5. Naturalidade (Place of Birth)
* **Formato**: Sempre em *Title Case* (primeira letra maiúscula, restantes minúsculas).
* **Exemplos**:
  * `MOCUBA` ➡️ `Mocuba`
  * `ZAVALA` ➡️ `Zavala`
  * `MORRUMBALA` ➡️ `Morrumbala`
  * `MAPUTO` ➡️ `Maputo`

---

### 6. Filiação (Parents)
* **Formato**: Nome do pai em CAIXA ALTA + ` and ` + Nome da mãe em CAIXA ALTA.
* **Exemplo Padrão**: `Parents: ROGÉRIO EDSON NHATSAVE and AMÉLIA TATIANA NETO`
* Preservar acentos nos nomes dos pais se constarem no BI.
* **Nomes Longos (Prevenção de Quebra de Linha)**: Quando os nomes forem extensos e causarem quebra com apenas o último sobrenome caindo para a linha seguinte (ex: `... ALEXANDRINA` / `CUMBE`), encapsular na tag com ajuste de tamanho e `nowrap`:
  ```html
  Parents: <span style="font-size: 14.5px; white-space: nowrap;">[NOME_DO_PAI] and [NOME_DA_MÃE]</span>
  ```
  Isso mantém ambos os nomes completos alinhados e sem quebras desagradáveis.

---

### 7. Gênero e Concordância de Pronomes na Linha 4
* Sexo **Masculino (M)**: `, he was submitted to the final exams in 2026<br />(two thousand and twenty-six)`
* Sexo **Feminino (F)**: `, she was submitted to the final exams in 2026<br />(two thousand and twenty-six)`
* A tag `<br />` antes de `(two thousand and twenty-six)` é usada em níveis padrão para o equilíbrio visual.

---

### 8. Nível do Curso e Regra para Textos Longos (Sem `<br />`)
* **Nível 5 Padrão** (Texto curto - com `<br />`):
  `Concluded the 5<sup>th</sup> level of English Course in this institution, [he/she] was submitted to the final exams in 2026<br />(two thousand and twenty-six)`
* **Textos Longos / Nível CEFR** (NÃO usar `<br />` - manter contínuo):
  Quando o texto do nível for longo (como a designação CEFR completa com data específica), **NÃO** inserir tags `<br />`. O texto deve fluir continuamente em linha para não estourar o layout vertical do certificado:
  `Concluded the Intermediate Level-B1 to Upper-Intermediate of the CEFR- Common European Framework of Reference For Languages on the 23<sup>rd</sup> May 2026 (two thousand and twenty-six)`

---

### 9. Notas e Classificações (Grades)
* Todas as classificações são divididas em 3 matérias: `Writing`, `Speaking` e `Average`.
* O campo `percent` possui o valor e o símbolo com espaço: `XX %`.
* O campo `spell` possui a grafia por extenso em inglês **capitalizada** (Title Case):
  * `60 %` ➡️ `Sixty percent`
  * `68 %` ➡️ `Sixty eight percent`
  * `71 %` ➡️ `Seventy one percent`
  * `73 %` ➡️ `Seventy three percent`
  * `75 %` ➡️ `Seventy five percent`
  * `79 %` ➡️ `Seventy nine percent`
  * `80 %` ➡️ `Eighty percent`
  * `83 %` ➡️ `Eighty three percent`
  * `85 %` ➡️ `Eighty five percent`

---

## 🔄 Fluxo de Atualização em 4 Passos Obrigatórios

Toda atualização de aluno deve sincronizar de forma atômica os seguintes pontos:

### Passo 1: Atualizar `loadCurrentStudentData` em [src/App.tsx](src/App.tsx)
Atualize a string `text` para que o botão "Carregar Aluno Atual" contenha os dados do aluno ativo:
```typescript
  const loadCurrentStudentData = () => {
    const text = `REPÚBLICA DE MOÇAMBIQUE
BILHETE DE IDENTIDADE
N°: 110104531919M
Nome / Name: WAGNER JULINO NHATSAVE
Data de Nascimento / Date of Birth: 06/07/2007
Naturalidade / Place of Birth: MAPUTO
Data de Emissão / Issuance Date: 30/07/2024
Nome do Pai / Father Name: ROGÉRIO EDSON NHATSAVE
Nome da Mãe / Mother Name: AMÉLIA TATIANA NETO
Sexo / Sex: M
Nível do curso: 5th
Curso: English
Data: 2026`;
    setQuickInputText(text);
    setQuickParseFeedback('Dados do aluno atual carregados. Clique em Analisar e Aplicar no Modelo.');
  };
```

### Passo 2: Incrementar `CACHE_VERSION` em [src/App.tsx](src/App.tsx)
Localize a linha ~349 e **some 1** ao número da versão (ex: de `'v100'` para `'v101'`).
```typescript
  useState(() => {
    const CACHE_VERSION = 'v101'; // <-- Sempre incrementar
```
> **Por que é crucial?** O aplicativo usa `localStorage` para manter alterações do usuário. Se o `CACHE_VERSION` não for incrementado, o navegador continuará mostrando os dados do aluno anterior em cache.

### Passo 3: Atualizar Linhas Padrão e Notas em [src/App.tsx](src/App.tsx)
Atualize os estados `cert-line1` a `cert-line5` e o array de `grades`:
```typescript
   const [line1, setLine1] = useLocalStorage('cert-line1', '<strong>Efigénio Cardiga José Vuma</strong>, headmaster of Language Community School certifies that <strong style="white-space: nowrap; color: #374151;">[NOME_DO_ALUNO]</strong>');
   const [line2, setLine2] = useLocalStorage('cert-line2', 'Born on the [DIA]<sup>[SUFIXO]</sup> of [MÊS] [ANO] with ID Nr [BI], issued on the [DIA]<sup>[SUFIXO]</sup> of [MÊS] [ANO] in [CIDADE] City.');
   const [line3, setLine3] = useLocalStorage('cert-line3', 'Place of birth: [Naturalidade], Parents: [PAI] and [MÃE]');
   const [line4, setLine4] = useLocalStorage('cert-line4', 'Concluded the 5<sup>th</sup> level of English Course in this institution, [he/she] was submitted to the final exams in 2026<br />(two thousand and twenty-six)');
   const [line5, setLine5] = useLocalStorage('cert-line5', 'Having got the following classification');

   const [grades, setGrades] = useState([
     { subject: 'Writing', percent: '[XX] %', spell: '[Xx percent]' },
     { subject: 'Speaking', percent: '[YY] %', spell: '[Yy percent]' },
     { subject: 'Average', percent: '[ZZ] %', spell: '[Zz percent]' }
   ]);
```

### Passo 4: Criar/Atualizar o Arquivo de Histórico em `students/[NOME_DO_ALUNO].md`
Crie um arquivo com a convenção `students/PRIMEIRO_SEGUNDO_ULTIMO.md` contendo:
1. Cabeçalho com o nome do aluno.
2. Bloco bruto do Quick Fill.
3. As 5 linhas formatadas completas.
4. As classificações numéricas e por extenso.

---

## ✅ Checklist de Pré-Conclusão (Auditoria do Agente)

Antes de entregar a atualização, o Agente Sênior DEVE validar cada item abaixo:

- [ ] **Nome**: O nome está em caixa alta, sem erros de digitação e com `<strong style="white-space: nowrap; color: #374151;">`?
- [ ] **BI**: O BI possui 13 dígitos completos e a letra está correta?
- [ ] **Datas**: Os dias têm os sufixos ordinais corretos (`1st`, `2nd`, `3rd`, `th`) dentro de `<sup>...</sup>`?
- [ ] **Mês**: Os meses estão traduzidos corretamente para o inglês?
- [ ] **Emissão**: Contém **`... City.`** no local de emissão (ex: `Maputo City.`)?
- [ ] **Naturalidade**: Está em Title Case (ex: `Maputo`, `Zavala`)?
- [ ] **Filiação**: Pais em maiúsculas separados por ` and `?
- [ ] **Gênero**: O pronome na Linha 4 coincide exatamente com o sexo (`he` para masculino, `she` para feminino)?
- [ ] **Quebra da Linha 4**: Contém a tag `<br />(two thousand and twenty-six)` intacta?
- [ ] **Notas**: Os valores de `percent` têm espaço antes de `%` e o extenso está correto e capitalizado?
- [ ] **Cache Version**: A constante `CACHE_VERSION` foi incrementada para forçar o reset no navegador?
- [ ] **Arquivo do Aluno**: O arquivo `.md` correspondente foi gerado em `students/`?
- [ ] **Integridade do Código**: Nenhuma função, CSS, SVG ou lógica interna foi tocada?
