import { IMAGENS_CATALOGO } from "../assets/images/catalogo/mapa";

export const IMAGENS_PRODUTO = {
  cesta: require("../assets/images/tabIcons/cesta-basica.png"),
  arroz: require("../assets/images/tabIcons/arroz.png"),
  feijao: require("../assets/images/tabIcons/feijao.png"),
  macarrao: require("../assets/images/tabIcons/macarrao.png"),
  oleo: require("../assets/images/tabIcons/oleo.png"),
  acucar: require("../assets/images/tabIcons/acucar.png"),
  sal: require("../assets/images/tabIcons/sal.png"),
  farinha: require("../assets/images/tabIcons/farinhadetrigo.png"),
  cafe: require("../assets/images/tabIcons/cafe.png"),
  biscoito: require("../assets/images/tabIcons/bolacha.png"),
  leite: require("../assets/images/tabIcons/leite.png"),
  agua: require("../assets/images/tabIcons/agua.png"),
  tomate: require("../assets/images/tabIcons/tomate.png"),
  cenoura: require("../assets/images/tabIcons/cenoura.png"),
  alface: require("../assets/images/tabIcons/alface.png"),
  ...IMAGENS_CATALOGO,
};

function normalizarNome(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function imagemLocalProduto(produto) {
  if (produto?.adminCadastrado === true || produto?.demonstracao !== true) {
    return null;
  }

  if (IMAGENS_PRODUTO[produto?.imagemChave]) {
    return IMAGENS_PRODUTO[produto.imagemChave];
  }

  const nome = normalizarNome(produto?.nome);

  for (const chave of Object.keys(IMAGENS_PRODUTO)) {
    if (
      nome &&
      (nome.includes(chave.replace(/-/g, " ")) ||
        normalizarNome(chave).includes(nome))
    ) {
      return IMAGENS_PRODUTO[chave];
    }
  }

  if (nome.includes("bolacha")) {
    return IMAGENS_PRODUTO.biscoito;
  }

  if (nome.includes("farinha")) {
    return IMAGENS_PRODUTO.farinha;
  }

  return null;
}
