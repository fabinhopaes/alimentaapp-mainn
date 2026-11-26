import React, {
  useState,
} from "react";

import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Modal,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebaseDb";
import { auth } from "../firebase";

import {
  CATEGORIAS_CAMPANHA,
  dataBRValida,
  montarDadosNovaCampanha,
  moedaParaNumero,
  validarPeriodoCampanha,
  validarUrlImagem,
} from "../utils/campanhasAdmin";

const VERDE = "#006838";
const FUNDO = "#FFFCF6";

function formatarDataDigitada(valor) {
  const digitos = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digitos.length <= 2) {
    return digitos;
  }

  if (digitos.length <= 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }

  return (
    `${digitos.slice(0, 2)}/` +
    `${digitos.slice(2, 4)}/` +
    digitos.slice(4)
  );
}

function obterDiasDoMes(mes) {
  const primeiroDia = new Date(
    mes.getFullYear(),
    mes.getMonth(),
    1
  ).getDay();
  const totalDias = new Date(
    mes.getFullYear(),
    mes.getMonth() + 1,
    0
  ).getDate();

  return [
    ...Array(primeiroDia).fill(null),
    ...Array.from(
      { length: totalDias },
      (_, indice) => indice + 1
    ),
  ];
}

function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}

function formatarNomeMes(data) {
  const nome = data.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
}

// ========================================
// CRIAR CAMPANHA
// ========================================

export default function TelaCriarCampanhaAdmin({
  navigation,
}) {
  const { width } = useWindowDimensions();

  const [nome, setNome] = useState("");

  const [
    descricao,
    setDescricao,
  ] = useState("");

  const [
    categoria,
    setCategoria,
  ] = useState("");

  const [inicio, setInicio] =
    useState("");

  const [termino, setTermino] =
    useState("");

  const [meta, setMeta] =
    useState("");

  const [imagemUrl, setImagemUrl] = useState("");
  const [imagemPreviewFalhou, setImagemPreviewFalhou] =
    useState(false);

  const [
    mostrarCategorias,
    setMostrarCategorias,
  ] = useState(false);

  const [campoData, setCampoData] = useState("");
  const [mesCalendario, setMesCalendario] = useState(
    () => {
      const hoje = new Date();
      return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }
  );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [erro, setErro] =
    useState("");

  function abrirCalendario(campo) {
    const valor = campo === "inicio" ? inicio : termino;
    const dataAtual = dataBRValida(valor);
    const base = dataAtual || new Date();

    setMesCalendario(
      new Date(base.getFullYear(), base.getMonth(), 1)
    );
    setCampoData(campo);
  }

  function selecionarDia(dia) {
    const data = new Date(
      mesCalendario.getFullYear(),
      mesCalendario.getMonth(),
      dia
    );
    const valor = formatarData(data);

    if (campoData === "inicio") {
      setInicio(valor);
    } else {
      setTermino(valor);
    }

    setErro("");
    setCampoData("");
  }

  // ========================================
  // CADASTRAR CAMPANHA NO FIRESTORE
  // ========================================

  async function criarCampanha() {
    if (salvando) return;

    setErro("");

    const erroPeriodo = validarPeriodoCampanha(inicio, termino);
    const valorMeta =
      moedaParaNumero(meta);

    if (
      nome.trim().length < 3 ||
      descricao.trim().length < 10 ||
      !categoria
    ) {
      setErro(
        "Preencha o nome, a descrição e a categoria."
      );

      return;
    }

    if (erroPeriodo) {
      setErro(erroPeriodo);
      return;
    }

    if (!Number.isFinite(valorMeta)) {
      setErro(
        "A meta deve estar entre R$ 0,00 e R$ 100.000.000,00."
      );

      return;
    }

    const erroImagem = validarUrlImagem(imagemUrl);

    if (erroImagem) {
      setErro(erroImagem);
      return;
    }

    if (imagemUrl.trim() && imagemPreviewFalhou) {
      setErro(
        "Não foi possível carregar a imagem. Use um link HTTPS público e direto para o arquivo."
      );
      return;
    }

    setSalvando(true);

    try {
      const usuario = auth.currentUser;

      if (!usuario) {
        throw new Error(
          "Sua sessão expirou. Entre novamente para criar a campanha."
        );
      }

      const token =
        await usuario.getIdTokenResult(true);

      if (
        token?.claims?.admin !== true
      ) {
        throw new Error(
          "Sua conta não possui permissão administrativa."
        );
      }

      await addDoc(
        collection(db, "campanhas"),
        montarDadosNovaCampanha({
          nome,
          descricao,
          categoria,
          inicio,
          termino,
          meta: valorMeta,
          imagemUrl,
          criadoPor: usuario.uid,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        })
      );

      navigation.goBack();
    } catch (e) {
      setErro(
        e.code === "permission-denied"
          ? "Acesso negado. Verifique as regras administrativas do Firestore."
          : e.message ||
            "Não foi possível cadastrar a campanha."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom"]}
    >
      <View
        style={[
          styles.painel,
          {
            width: Math.min(width, 460),
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* CABEÇALHO */}

          <View style={styles.topo}>
            <TouchableOpacity
              style={styles.voltar}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Ionicons
                name="chevron-back"
                size={25}
                color={VERDE}
              />
            </TouchableOpacity>

            <Text style={styles.titulo}>
              Criar Campanha
            </Text>
          </View>

          <Text style={styles.subtitulo}>
            Preencha as informações para criar uma nova campanha.
          </Text>

          {/* IMAGEM */}

          <View style={styles.imagemArea}>
            <View style={styles.imagemCaixa}>
              {imagemUrl.trim() &&
              !validarUrlImagem(imagemUrl) &&
              !imagemPreviewFalhou ? (
                <Image
                  key={imagemUrl.trim()}
                  source={{ uri: imagemUrl.trim() }}
                  resizeMode="contain"
                  style={styles.imagem}
                  onError={() => setImagemPreviewFalhou(true)}
                />
              ) : (
                <View style={styles.imagemVazia}>
                  <Ionicons
                    name="image-outline"
                    size={37}
                    color={VERDE}
                  />
                </View>
              )}

              <View style={styles.infoImagem}>
                <Text style={styles.adicionar}>
                  Imagem por link
                </Text>

                <Text style={styles.ajudaImagem}>
                  Use um link HTTPS público e direto para a imagem.
                </Text>
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.linkImagem]}
              placeholder="https://exemplo.com/imagem.jpg"
              value={imagemUrl}
              onChangeText={(valor) => {
                setImagemUrl(valor);
                setImagemPreviewFalhou(false);
                setErro("");
              }}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={2048}
              accessibilityLabel="Link público da imagem da campanha"
            />

            {imagemUrl.trim() && imagemPreviewFalhou && (
              <Text style={styles.erroImagem}>
                Não foi possível carregar a prévia. Confira se o link abre diretamente uma imagem pública.
              </Text>
            )}

            {!!imagemUrl.trim() && (
              <TouchableOpacity
                style={styles.removerImagem}
                onPress={() => {
                  setImagemUrl("");
                  setImagemPreviewFalhou(false);
                  setErro("");
                }}
                accessibilityRole="button"
                accessibilityLabel="Remover link da imagem da campanha"
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color="#A32D2D"
                />
                <Text style={styles.removerImagemTexto}>
                  Remover link
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* NOME */}

          <Text style={styles.rotulo}>
            Nome da Campanha
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Digite o nome da campanha"
            value={nome}
            onChangeText={setNome}
            maxLength={100}
          />

          {/* DESCRIÇÃO */}

          <Text style={styles.rotulo}>
            Descrição
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.desc,
            ]}
            placeholder="Descreva o objetivo da campanha"
            multiline
            value={descricao}
            onChangeText={setDescricao}
            maxLength={500}
            textAlignVertical="top"
          />

          {/* CATEGORIA */}

          <Text style={styles.rotulo}>
            Categoria
          </Text>

          <TouchableOpacity
            style={styles.seletor}
            onPress={() =>
              setMostrarCategorias(!mostrarCategorias)
            }
          >
            <Text
              style={{
                color: categoria
                  ? "#333333"
                  : "#999999",
                fontSize: 12,
              }}
            >
              {categoria ||
                "Selecione uma categoria"}
            </Text>

            <Ionicons
              name="chevron-down"
              size={19}
            />
          </TouchableOpacity>

          {mostrarCategorias &&
            CATEGORIAS_CAMPANHA.map(
              (item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.opcao}
                  onPress={() => {
                    setCategoria(item);
                    setMostrarCategorias(false);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )
            )}

          {/* DATAS */}

          <View style={styles.datas}>
            <View style={styles.dataCol}>
              <Text style={styles.rotulo}>
                Data de Início
              </Text>

              <View style={styles.dataCampo}>
                <TextInput
                  style={styles.dataInput}
                  placeholder="dd/mm/aaaa"
                  value={inicio}
                  onChangeText={(valor) => {
                    setInicio(formatarDataDigitada(valor));
                    setErro("");
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                />

                <TouchableOpacity
                  onPress={() => abrirCalendario("inicio")}
                  accessibilityRole="button"
                  accessibilityLabel="Escolher data de início no calendário"
                >
                  <Ionicons
                    name="calendar-outline"
                    color={VERDE}
                    size={18}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dataCol}>
              <Text style={styles.rotulo}>
                Data de Término
              </Text>

              <View style={styles.dataCampo}>
                <TextInput
                  style={styles.dataInput}
                  placeholder="dd/mm/aaaa"
                  value={termino}
                  onChangeText={(valor) => {
                    setTermino(formatarDataDigitada(valor));
                    setErro("");
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                />

                <TouchableOpacity
                  onPress={() => abrirCalendario("termino")}
                  accessibilityRole="button"
                  accessibilityLabel="Escolher data de término no calendário"
                >
                  <Ionicons
                    name="calendar-outline"
                    color={VERDE}
                    size={18}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* META */}

          <Text style={styles.rotulo}>
            Meta de arrecadação{" "}
            <Text
              style={{
                color: "#777777",
                fontSize: 11,
              }}
            >
              (opcional)
            </Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder="R$ 0,00"
            value={meta}
            onChangeText={setMeta}
            keyboardType="decimal-pad"
          />

          {!!erro && (
            <Text style={styles.erro}>
              {erro}
            </Text>
          )}

          {/* BOTÕES */}

          <View style={styles.botoes}>
            <TouchableOpacity
              style={styles.cancelar}
              onPress={() =>
                navigation.goBack()
              }
              disabled={salvando}
            >
              <Text style={styles.cancelarTexto}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.salvar}
              onPress={criarCampanha}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.salvarTexto}>
                  Criar campanha
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={Boolean(campoData)}
        transparent
        animationType="fade"
        onRequestClose={() => setCampoData("")}
      >
        <View style={styles.calendarioFundo}>
          <View style={styles.calendario}>
            <View style={styles.calendarioTopo}>
              <Text style={styles.calendarioTitulo}>
                {campoData === "inicio"
                  ? "Data de Início"
                  : "Data de Término"}
              </Text>
              <TouchableOpacity
                onPress={() => setCampoData("")}
                accessibilityRole="button"
                accessibilityLabel="Fechar calendário"
              >
                <Ionicons name="close" size={23} color={VERDE} />
              </TouchableOpacity>
            </View>

            <View style={styles.navegacaoMes}>
              <TouchableOpacity
                onPress={() =>
                  setMesCalendario(
                    (atual) =>
                      new Date(
                        atual.getFullYear(),
                        atual.getMonth() - 1,
                        1
                      )
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
              >
                <Ionicons name="chevron-back" size={22} color={VERDE} />
              </TouchableOpacity>

              <Text style={styles.nomeMes}>
                {formatarNomeMes(mesCalendario)}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setMesCalendario(
                    (atual) =>
                      new Date(
                        atual.getFullYear(),
                        atual.getMonth() + 1,
                        1
                      )
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
              >
                <Ionicons name="chevron-forward" size={22} color={VERDE} />
              </TouchableOpacity>
            </View>

            <View style={styles.gradeCalendario}>
              {["D", "S", "T", "Q", "Q", "S", "S"].map(
                (dia, indice) => (
                  <Text
                    key={`semana-${indice}`}
                    style={styles.diaSemana}
                  >
                    {dia}
                  </Text>
                )
              )}

              {obterDiasDoMes(mesCalendario).map(
                (dia, indice) =>
                  dia ? (
                    <TouchableOpacity
                      key={`dia-${dia}`}
                      style={styles.diaCalendario}
                      onPress={() => selecionarDia(dia)}
                      accessibilityRole="button"
                      accessibilityLabel={`${dia} de ${mesCalendario.toLocaleDateString(
                        "pt-BR",
                        { month: "long" }
                      )}`}
                    >
                      <Text style={styles.textoDia}>
                        {dia}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      key={`vazio-${indice}`}
                      style={styles.diaCalendario}
                    />
                  )
              )}
            </View>

            <TouchableOpacity
              style={styles.botaoFecharCalendario}
              onPress={() => setCampoData("")}
            >
              <Text style={styles.textoFecharCalendario}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ========================================
// ESTILOS
// ========================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: FUNDO,
    alignItems: "center",
  },

  painel: {
    flex: 1,
    maxWidth: 460,
  },

  conteudo: {
    padding: 18,
    paddingBottom: 36,
  },

  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  voltar: {
    height: 37,
    width: 37,
    borderRadius: 20,
    backgroundColor: "#E8EEE0",
    justifyContent: "center",
    alignItems: "center",
  },

  titulo: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: VERDE,
  },

  subtitulo: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#777777",
    marginTop: 10,
    marginBottom: 14,
  },

  imagemCaixa: {
    width: "100%",
    backgroundColor: "#E6E6E0",
    minHeight: 100,
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  imagem: {
    height: 90,
    width: 90,
    borderRadius: 7,
  },

  imagemArea: {
    marginBottom: 12,
  },

  linkImagem: {
    marginTop: 10,
  },

  erroImagem: {
    fontSize: 11,
    color: "#B3261E",
    marginTop: 6,
  },

  imagemVazia: {
    height: 90,
    width: 90,
    alignItems: "center",
    justifyContent: "center",
  },

  adicionar: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: VERDE,
  },

  ajudaImagem: {
    fontSize: 10,
    color: "#555555",
  },

  infoImagem: {
    flex: 1,
    minWidth: 0,
  },

  removerImagem: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  removerImagemTexto: {
    fontSize: 11,
    color: "#A32D2D",
  },

  rotulo: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: "#111111",
    marginTop: 11,
    marginBottom: 7,
  },

  input: {
    minHeight: 45,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D9DED5",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  desc: {
    minHeight: 83,
    paddingTop: 12,
  },

  seletor: {
    height: 45,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D9DED5",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  opcao: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  datas: {
    flexDirection: "row",
    gap: 13,
    marginTop: 8,
  },

  dataCol: {
    flex: 1,
  },

  dataCampo: {
    height: 45,
    borderWidth: 1,
    borderColor: "#D9DED5",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
  },

  dataInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
  },

  calendarioFundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  calendario: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: FUNDO,
    borderRadius: 14,
    padding: 17,
    elevation: 8,
  },

  calendarioTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  calendarioTitulo: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: VERDE,
  },

  navegacaoMes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 7,
    paddingHorizontal: 8,
  },

  nomeMes: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#222222",
  },

  gradeCalendario: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  diaSemana: {
    width: "14.2857%",
    textAlign: "center",
    paddingVertical: 8,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#777777",
  },

  diaCalendario: {
    width: "14.2857%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  textoDia: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#222222",
  },

  botaoFecharCalendario: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 5,
  },

  textoFecharCalendario: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: VERDE,
  },

  erro: {
    fontSize: 12,
    color: "#B3261E",
    textAlign: "center",
    marginTop: 12,
  },

  botoes: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30,
  },

  cancelar: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderColor: VERDE,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  salvar: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#3D9924",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelarTexto: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  salvarTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
});