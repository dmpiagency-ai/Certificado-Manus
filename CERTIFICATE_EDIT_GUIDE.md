# Manual de Instruções: Atualização de Alunos no Certificado

Use este guia em qualquer IA ou IDE para atualizar os dados de novos alunos no projeto de certificados sem cometer erros.

---

## 🚀 Fluxo de Trabalho (Passo a Passo)

### 1. Extração de Dados dos Prints (BI)
Identifique as seguintes informações nos documentos do aluno:
* **Nome**: Nome Completo em Maiúsculas (ex: `MELIVO ISSA DADE`).
* **Nascimento**: Data no formato `DD/MM/AAAA` (ex: `25/03/2006`).
* **Número do BI**: Número completo incluindo a letra no final (ex: `081404930287B`).
* **Emissão**: Data no formato `DD/MM/AAAA` (ex: `15/11/2024`).
* **Local de Emissão**: Sempre traduza "Cidade de..." para o Inglês (ex: `CIDADE DE MAPUTO` ➡️ `Maputo City`, `CIDADE DE INHAMBANE` ➡️ `Inhambane City`).
* **Naturalidade (Birthplace)**: Nome da cidade/distrito capitalizada (ex: `MORRUMBALA` ➡️ `Morrumbala`).
* **Filiação**: Nome do pai e da mãe (ex: `ISSA DADE` e `LEONILDE DA COSTA NOBRE DO ROSÁRIO`).
* **Sexo (Pronome)**: `M` ➡️ usar pronomes masculinos (`he`), `F` ➡️ usar pronomes femininos (`she`).
* **Curso / Nível**: Geralmente `5th level of English Course` (ou outro conforme instruído).
* **Notas (Grades)**: Extraia as porcentagens e a grafia por extenso em inglês:
  * **Writing**: ex: `68 %` ➡️ `Sixty eight percent`
  * **Speaking**: ex: `73 %` ➡️ `Seventy three percent`
  * **Average**: ex: `71 %` ➡️ `Seventy one percent`

---

### 2. Modificação no Arquivo `src/App.tsx`

Abra o arquivo [src/App.tsx](src/App.tsx) e realize três edições principais:

#### A. Atualizar a Função `loadCurrentStudentData`
Substitua o template da string `text` com os dados literais do aluno novo:
```typescript
  const loadCurrentStudentData = () => {
    const text = `REPÚBLICA DE MOÇAMBIQUE
BILHETE DE IDENTIDADE
N°: [NÚMERO_DO_BI]
Nome / Name: [NOME_COMPLETO]
Data de Nascimento / Date of Birth: [DD/MM/AAAA]
Naturalidade / Place of Birth: [NATURALIDADE]
Data de Emissão / Issuance Date: [DD/MM/AAAA]
Nome do Pai / Father Name: [NOME_DO_PAI]
Nome da Mãe / Mother Name: [NOME_DA_MÃE]
Sexo / Sex: [M/F]
Nível do curso: [NÍVEL]
Curso: [CURSO]
Data: 2026`;
    setQuickInputText(text);
    setQuickParseFeedback('Dados do aluno atual carregados. Clique em Analisar e Aplicar no Modelo.');
  };
```

#### B. Incrementar a Versão do Cache (`CACHE_VERSION`)
Procure pela constante `CACHE_VERSION` (geralmente próxima à linha 349) e **incremente em 1** (ex: se estiver `'v96'`, mude para `'v97'`). Isso força o navegador a invalidar o localStorage antigo e aplicar os novos dados padrão.
```typescript
  useState(() => {
    const CACHE_VERSION = 'v97'; // Incremente aqui
    ...
```

#### C. Atualizar as Linhas de Texto do Certificado (`line1` a `line4`) e `grades`
Substitua as variáveis de estado padrão observando as regras gramaticais e tags HTML:

```typescript
   const [line1, setLine1] = useLocalStorage('cert-line1', '<strong>Efigénio Cardiga José Vuma</strong>, headmaster of Language Community School certifies that <strong style="white-space: nowrap; color: #374151;">[NOME_COMPLETO]</strong>');
    const [line2, setLine2] = useLocalStorage('cert-line2', 'Born on the [DIA]<sup>[SUFIXO]</sup> of [MÊS_EM_INGLÊS] [ANO] with ID Nr [BI], issued on the [DIA]<sup>[SUFIXO]</sup> of [MÊS_EM_INGLÊS] [ANO] in [CIDADE_EM_INGLÊS] City.');
   const [line3, setLine3] = useLocalStorage('cert-line3', 'Place of birth: [Naturalidade], Parents: [PAI] and [MÃE]');
   const [line4, setLine4] = useLocalStorage('cert-line4', 'Concluded the [NÍVEL] level of English Course in this institution, [he/she] was submitted to the final exams in 2026<br />(two thousand and twenty-six)');
```

E a pauta de notas default:
```typescript
  const [grades, setGrades] = useState([
    { subject: 'Writing', percent: '[NOTA] %', spell: '[Nota_Por_Extenso_Em_Inglês_Capitalizada]' },
    { subject: 'Speaking', percent: '[NOTA] %', spell: '[Nota_Por_Extenso_Em_Inglês_Capitalizada]' },
    { subject: 'Average', percent: '[NOTA] %', spell: '[Nota_Por_Extenso_Em_Inglês_Capitalizada]' }
  ]);
```

---

## ⚠️ Regras Cruciais de Formatação

1. **Sufixos Ordinais em Datas**: Use tags `<sup>` para sufixos:
   * Termina em 1 (exceto 11): `<sup>st</sup>` (ex: `1<sup>st</sup>`, `21<sup>st</sup>`, `31<sup>st</sup>`)
   * Termina em 2 (exceto 12): `<sup>nd</sup>` (ex: `2<sup>nd</sup>`, `22<sup>nd</sup>`)
   * Termina em 3 (exceto 13): `<sup>rd</sup>` (ex: `3<sup>rd</sup>`, `23<sup>rd</sup>`)
   * Restante: `<sup>th</sup>` (ex: `11<sup>th</sup>`, `15<sup>th</sup>`, `8<sup>th</sup>`)
2. **Pronombre (Gênero)**: 
   * Para Sexo **M**: Use `he was submitted` na `line4`.
   * Para Sexo **F**: Use `she was submitted` na `line4`.
3. **Cidade com "City"**: Traduza `Cidade de Maputo` para `Maputo City` e `Cidade de Inhambane` para `Inhambane City`.
4. **Preservação de Tags HTML**: Mantenha as tags `<strong>`, `<strong style="...">` e `<br />` exatamente iguais nos textos padrão para manter a estilização do layout intacta.
5. **Nível Especial ("Upper")**: Se for instruído a mudar o nível para "upper", use exatamente o seguinte texto de nível:
   * **Nível por Extenso**: `Intermediate Level-B1 to Upper-Intermediate of the CEFR- Common European Framework of Reference For Languages`
   * **Como aplicar na `line4`** (com o pronome correspondente):
     `Concluded the Intermediate Level-B1 to Upper-Intermediate of the CEFR- Common European Framework of Reference For Languages in this institution, [he/she] was submitted to the final exams in 2026<br />(two thousand and twenty-six)`
6. **Nível Especial ("5")**: Se for instruído a mudar o nível para "5" ou "nível 5", use a seguinte designação:
   * **Nível**: `5th`
   * **Como aplicar na `line4`** (com o pronome correspondente):
     `Concluded the 5<sup>th</sup> level of English Course in this institution, [he/she] was submitted to the final exams in 2026<br />(two thousand and twenty-six)`

---

### 3. Salvar Histórico do Aluno
Sempre crie ou atualize o histórico do aluno na pasta `students/` no formato Markdown (ex: `students/NOME_DO_ALUNO.md`) contendo a versão bruta do Quick Fill para recuperação rápida futura.
