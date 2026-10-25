# BolsoCerto - calculadoras financeiras para Portugal

Site estático com 4 calculadoras (salário líquido, recibos verdes, crédito habitação, juros compostos) otimizado para SEO e monetizado com **Google AdSense** e **links de afiliados**. Custo de alojamento: 0 €. Única despesa: o domínio (cerca de 10-20 €/ano).

## Porque é que isto pode dar dinheiro

- Pesquisas como "salário líquido", "simulador recibos verdes" e "simulador crédito habitação" têm muito volume em Portugal todos os meses e repetem-se todos os anos.
- Finanças pessoais é dos nichos com anúncios mais bem pagos (bancos, crédito, corretoras).
- Cada visitante está a meio de uma decisão financeira, o momento ideal para um link de afiliado (crédito, corretora, banco, faturação).
- Depois de publicado, quase não exige manutenção: atualizar os parâmetros fiscais uma vez por ano.

Expectativa realista: o SEO demora tipicamente 3 a 9 meses a trazer tráfego. Os ganhos dependem por completo do tráfego que conseguires; não há garantias.

## Comandos

```bash
npm test        # testes do motor de cálculo
npm run build   # gera o site em dist/
npm run dev     # build + servidor local em http://localhost:8080
```

Não há dependências para instalar (só Node 18+).

## Passo a passo para lançar

1. **Verificar os parâmetros fiscais do ano corrente.** Todos os valores (escalões de IRS, IAS, mínimo de existência, IRS Jovem, subsídio de alimentação, Segurança Social) estão num único sítio: `PARAMS` em [src/assets/js/engine.js](src/assets/js/engine.js). Confirma-os no Portal das Finanças / Orçamento do Estado do ano em vigor, atualiza `year` e corre `npm test` (ajusta os testes que dependam de valores concretos). O ano aparece automaticamente em todos os títulos e textos.
2. **Comprar um domínio** (.pt ou .com) e pôr o endereço em `siteUrl` em [site.config.json](site.config.json). Preenche também `contactEmail` (se vazio, usa `contactUrl`).
3. **Publicar grátis no Cloudflare Pages** (ou Netlify):
   - Cria um repositório no GitHub com esta pasta.
   - Cloudflare Pages: "Create project" > liga o repositório > Build command: `node build.js` > Output directory: `dist`.
   - Liga o domínio ao projeto.
4. **Google Search Console:** adiciona o domínio e submete `https://O-TEU-DOMINIO/sitemap.xml`.
5. **AdSense** (quando o site já tiver algumas semanas e tráfego):
   - Candidata-te em adsense.google.com com o domínio.
   - Coloca o teu ID (`ca-pub-...`) em `adsenseClient` no `site.config.json` e volta a publicar. O script e o `ads.txt` são gerados automaticamente.
   - Ativa os "Anúncios automáticos".
   - Obrigatório na UE: em AdSense > Privacidade e mensagens, ativa a mensagem de consentimento RGPD (CMP certificada da Google).
6. **Afiliados:** inscreve-te nos programas e cola os teus links em `affiliates` no `site.config.json`. Cartões sem `url` não aparecem. Programas a procurar (confirma condições atuais de cada um):
   - Corretoras: Trading 212, XTB, Lightyear (programas próprios de afiliados).
   - Bancos: Revolut e outros bancos digitais (redes como Impact ou Awin).
   - Crédito: intermediários de crédito e comparadores (Doutor Finanças, ComparaJá) - estes costumam pagar bem por lead.
   - Faturação para freelancers: InvoiceXpress, Moloni.
   - Podes adicionar novas categorias e usá-las numa página com `{{affiliates:nome}}`.
7. **Estatísticas (opcional):** cola o snippet de um serviço sem cookies (ex.: Cloudflare Web Analytics) em `analyticsSnippet`.

## Como trazer tráfego mais depressa

- Partilha as calculadoras em comunidades portuguesas de finanças pessoais (Reddit, grupos de Facebook, fóruns) quando alguém perguntar exatamente o que a calculadora responde. Os links já guardam os valores da simulação.
- Em janeiro e em abril (época do IRS) há picos de pesquisa: tem os parâmetros atualizados antes disso.
- Cada nova calculadora é uma nova porta de entrada no Google. Ideias com muita procura: IMT e imposto do selo na compra de casa, indemnização por despedimento, subsídio de desemprego, mais-valias de ações/cripto, PPR, IRS Jovem isolado, transferência de crédito habitação.

## Estrutura

```
site.config.json        nome, domínio, AdSense, afiliados
build.js                gerador estático (src/ -> dist/), sitemap, robots, ads.txt, dados estruturados
serve.js                servidor local de pré-visualização
src/layout.html         cabeçalho, rodapé e meta tags comuns
src/pages/*.html        páginas (bloco <!--meta {...}--> no topo + conteúdo)
src/assets/js/engine.js motor de cálculo puro (único sítio com regras fiscais)
src/assets/js/ui.js     formatação, gráficos, links partilháveis
src/assets/js/*.js      lógica de cada calculadora
test/engine.test.js     testes do motor
```

Para criar uma página nova: copia uma de `src/pages/`, muda o bloco `meta` (o `path` define o URL) e, se tiver perguntas frequentes no formato `<details class="faq">`, os dados estruturados FAQ são gerados automaticamente.
