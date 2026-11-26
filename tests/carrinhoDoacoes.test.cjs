const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const { transformSync } = require("@babel/core");

require.extensions[".png"] = (modulo, arquivo) => {
  modulo.exports = arquivo;
};

function carregarModulo(relativo) {
  const caminho = path.resolve(__dirname, "..", relativo);
  const fonte = fs.readFileSync(caminho, "utf8");
  const compilado = transformSync(fonte, {
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  }).code;
  const modulo = new Module(caminho, module);

  modulo.filename = caminho;
  modulo.paths = Module._nodeModulePaths(path.dirname(caminho));
  modulo._compile(compilado, caminho);

  return modulo.exports;
}

const {
  calcularSubtotalItem,
  calcularTotalCarrinho,
  criarAtualizacaoDoacaoConcluida,
  criarDadosDoacaoCampanha,
  criarDadosDoacaoAgrupada,
  validarQuantidadeCarrinho,
} = carregarModulo("utils/carrinhoCalculos.js");
const carregarOriginal = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "../assets/images/catalogo/mapa") {
    return { IMAGENS_CATALOGO: { batatas: "batatas.png" } };
  }

  return carregarOriginal.call(this, request, parent, isMain);
};
const {
  IMAGENS_PRODUTO,
  imagemLocalProduto,
} = carregarModulo("utils/imagensProdutos.js");
Module._load = carregarOriginal;

test("resolve no carrinho a imagem demonstrativa pelo nome e pela chave do produto", () => {
  assert.equal(
    imagemLocalProduto({ nome: "Arroz integral", demonstracao: true }),
    IMAGENS_PRODUTO.arroz
  );
  assert.equal(
    imagemLocalProduto({
      nome: "Produto sem imagem",
      imagemChave: "batatas",
      demonstracao: true,
    }),
    IMAGENS_PRODUTO.batatas
  );
  assert.equal(
    imagemLocalProduto({ nome: "Arroz", demonstracao: false }),
    null
  );
});

test("soma subtotal e total de vários produtos com preço por unidade", () => {
  const itens = [
    { precoUnitario: 6.29, quantidade: 2 },
    { precoUnitario: 4.5, quantidade: 3 },
  ];

  assert.equal(calcularSubtotalItem(itens[0]), 12.58);
  assert.equal(calcularTotalCarrinho(itens), 26.08);
});

test("aceita quantidade de 1 até o estoque e rejeita limites inválidos", () => {
  assert.equal(validarQuantidadeCarrinho(1, 9), true);
  assert.equal(validarQuantidadeCarrinho(9, 9), true);
  assert.equal(validarQuantidadeCarrinho(0, 9), false);
  assert.equal(validarQuantidadeCarrinho(10, 9), false);
  assert.equal(validarQuantidadeCarrinho(1.5, 9), false);
});

test("registra a doação ao entrar no pagamento e só a conclui a partir do estado pendente", () => {
  const doacao = criarDadosDoacaoAgrupada(
    [
      {
        produtoId: "abobora",
        nome: "Abóboras",
        quantidade: 2,
        unidade: "kg",
        precoUnitario: 6.29,
        cidade: "Suzano - SP",
        demonstracao: true,
      },
      {
        produtoId: "arroz",
        nome: "Arroz 1 kg",
        quantidade: 1,
        unidade: "pacotes",
        precoUnitario: 5.5,
        cidade: "Suzano - SP",
        demonstracao: true,
      },
    ],
    "usuario-1"
  );

  assert.equal(doacao.status, "Em andamento");
  assert.equal(doacao.pagamentoStatus, "aguardando_pagamento");
  assert.equal(doacao.tipoDoacao, "agrupada");
  assert.equal(doacao.criadoPor, "usuario-1");
  assert.equal(doacao.quantidadeItens, 2);
  assert.equal(doacao.itens.length, 2);
  assert.equal(doacao.total, 18.08);
  assert.deepEqual(doacao.quantidadesPorProduto, {
    abobora: 2,
    arroz: 1,
  });

  const dadosPagamento = {
    formaPagamento: "debito",
    totalSimuladoCentavos: 1808,
  };
  const atualizacao = criarAtualizacaoDoacaoConcluida(
    doacao,
    dadosPagamento
  );
  assert.deepEqual(atualizacao, {
    status: "Concluída",
    pagamentoStatus: "simulacao_concluida",
    ...dadosPagamento,
  });

  const atualizacaoCredito = criarAtualizacaoDoacaoConcluida(
    doacao,
    {
      formaPagamento: "credito",
      totalSimuladoCentavos: 1900,
      parcelas: 2,
      valorParcelaCentavos: 950,
      ultimaParcelaCentavos: 950,
      jurosPercentual: 5,
    }
  );
  assert.equal(atualizacaoCredito.formaPagamento, "credito");
  assert.equal(atualizacaoCredito.totalSimuladoCentavos, 1900);
  assert.equal(atualizacaoCredito.parcelas, 2);

  assert.throws(
    () =>
      criarAtualizacaoDoacaoConcluida({
        ...doacao,
        ...atualizacao,
      }, dadosPagamento),
    /não está aguardando/
  );
  assert.throws(
    () =>
      criarAtualizacaoDoacaoConcluida(doacao, {
        formaPagamento: "debito",
        totalSimuladoCentavos: 18.08,
      }),
    /dados do pagamento/
  );
});

test("cria doação monetária de campanha sem itens e valida seu valor", () => {
  const doacao = criarDadosDoacaoCampanha(
    2050,
    {
      id: "campanha-1",
      nome: "Campanha de inverno",
      categoria: "Emergencial",
    },
    "usuario-1"
  );

  assert.equal(doacao.status, "Em andamento");
  assert.equal(doacao.pagamentoStatus, "aguardando_pagamento");
  assert.equal(doacao.tipoDoacao, "campanha");
  assert.equal(doacao.campanhaId, "campanha-1");
  assert.equal(doacao.total, 20.5);
  assert.equal(doacao.preco, "R$ 20,50");
  assert.equal(Object.hasOwn(doacao, "itens"), false);
  assert.deepEqual(
    criarAtualizacaoDoacaoConcluida(doacao, {
      formaPagamento: "pix",
      totalSimuladoCentavos: 2050,
    }),
    {
      status: "Concluída",
      pagamentoStatus: "simulacao_concluida",
      formaPagamento: "pix",
      totalSimuladoCentavos: 2050,
    }
  );
  assert.throws(
    () => criarDadosDoacaoCampanha(0, { id: "campanha-1", nome: "Campanha" }, "usuario-1"),
    /maior que zero/
  );
  assert.throws(
    () => criarDadosDoacaoCampanha(1000, { nome: "Campanha" }, "usuario-1"),
    /identificar a campanha/
  );
});

test("persiste carrinhos locais isolados por usuário", async () => {
  const memoria = new Map();
  const armazenamento = {
    async getItem(chave) {
      return memoria.get(chave) ?? null;
    },
    async multiSet(pares) {
      pares.forEach(([chave, valor]) => memoria.set(chave, valor));
    },
    async multiRemove(chaves) {
      chaves.forEach((chave) => memoria.delete(chave));
    },
  };
  const carregarOriginal = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "@react-native-async-storage/async-storage") {
      return { __esModule: true, default: armazenamento };
    }

    return carregarOriginal.call(this, request, parent, isMain);
  };

  let local;
  try {
    local = carregarModulo("utils/carrinhoLocal.js");
  } finally {
    Module._load = carregarOriginal;
  }

  const item = {
    produtoId: "demo-abobora",
    nome: "Abóboras",
    disponibilidade: 9,
    unidade: "kg",
  };

  await local.salvarNoCarrinhoLocal("usuario-a", item, 2);

  assert.equal((await local.lerCarrinhoLocal("usuario-a"))[0].quantidade, 2);
  assert.deepEqual(await local.lerCarrinhoLocal("usuario-b"), []);
  assert.equal(await local.usarCarrinhoLocal("usuario-a"), true);
});
