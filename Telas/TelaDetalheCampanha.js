import React, { useState } from "react";

import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { imagemCampanha } from "../utils/campanhasAdmin";
import { auth } from "../firebase";
import { iniciarDoacaoCampanha } from "../utils/carrinhoDoacoes";

const VERDE = "#006838";
const FUNDO = "#FFFCF6";
const SUGESTOES_DOACAO = ["10,00", "20,00", "50,00"];

function formatarMeta(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return "";
  }

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function TelaDetalheCampanha({
  navigation,
  route,
}) {
  const { width } = useWindowDimensions();
  const campanha = route?.params?.campanha;
  const ativa = campanha?.status === "Ativa";
  const meta = formatarMeta(campanha?.meta);
  const responsavel =
    campanha?.responsavel ||
    campanha?.organizacao ||
    campanha?.estabelecimento;
  const [valorDoacao, setValorDoacao] = useState("");
  const [erroValor, setErroValor] = useState("");
  const [iniciandoDoacao, setIniciandoDoacao] = useState(false);

  async function contribuir() {
    if (iniciandoDoacao) return;
    const valorNormalizado = valorDoacao.trim().replace(",", ".");
    if (!/^\d+\.\d{2}$/.test(valorNormalizado)) {
      setErroValor("Informe um valor válido com duas casas decimais, como 10,00.");
      return;
    }

    const valorCentavos = Math.round(Number(valorNormalizado) * 100);
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
      setErroValor("O valor da doação deve ser maior que R$ 0,00.");
      return;
    }

    setErroValor("");
    setIniciandoDoacao(true);
    try {
      const { doacaoId } = await iniciarDoacaoCampanha(
        valorCentavos,
        campanha,
        auth.currentUser?.uid
      );
      navigation.navigate("TelaSeuPedido", {
        pedido: {
          fluxo: "doacaoCampanha",
          doacaoId,
          nomeCampanha: campanha?.nome || "Campanha",
          valorCentavos,
        },
      });
    } catch (erroInicio) {
      console.error("Erro ao iniciar doação para campanha:", erroInicio);
      setErroValor(
        erroInicio.code === "permission-denied"
          ? "Não foi possível registrar a doação. Verifique as regras do Firestore e tente novamente."
          : erroInicio.message || "Não foi possível iniciar a doação. Tente novamente."
      );
    } finally {
      setIniciandoDoacao(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.tela, { width: Math.min(width, 460) }]}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          showsVerticalScrollIndicator={false}
        >
          {imagemCampanha(campanha) ? (
            <Image
              source={imagemCampanha(campanha)}
              resizeMode="cover"
              style={styles.imagem}
            />
          ) : (
            <View style={[styles.imagem, styles.imagemVazia]}>
              <Ionicons name="basket-outline" size={76} color={VERDE} />
            </View>
          )}

          <TouchableOpacity
            style={styles.voltar}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("TelaCampanhas")
            }
            accessibilityRole="button"
            accessibilityLabel="Voltar para campanhas"
          >
            <Ionicons name="chevron-back" size={23} color={VERDE} />
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.titulo}>
              {campanha?.nome || "Campanha não encontrada"}
            </Text>
            <Text style={styles.descricao}>
              {campanha?.descricao ||
                "Volte para a lista e selecione uma campanha disponível."}
            </Text>

            {!!campanha && (
              <>
                {!!campanha.prazo && (
                  <Text style={styles.prazo}>{campanha.prazo}</Text>
                )}

                {!!campanha.categoria && (
                  <Text style={styles.informacao}>
                    Categoria: {campanha.categoria}
                  </Text>
                )}

                {!!campanha.inicio && (
                  <Text style={styles.informacao}>
                    Início: {campanha.inicio}
                  </Text>
                )}

                {!!campanha.termino && (
                  <Text style={styles.informacao}>
                    Término: {campanha.termino}
                  </Text>
                )}

                {!!responsavel && (
                  <Text style={styles.informacao}>
                    Responsável: {responsavel}
                  </Text>
                )}

                {!!meta && (
                  <View style={styles.meta}>
                    <Text style={styles.metaTitulo}>
                      Meta da campanha
                    </Text>
                    <Text style={styles.metaTexto}>
                      {meta}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.valorArea}>
            <Text style={styles.valorRotulo}>Valor da doação</Text>
            <View style={styles.campoValor}>
              <Text style={styles.prefixoValor}>R$</Text>
              <TextInput
                style={styles.valorInput}
                value={valorDoacao}
                onChangeText={(valor) => {
                  setValorDoacao(valor);
                  setErroValor("");
                }}
                placeholder="0,00"
                placeholderTextColor="#8A8A82"
                keyboardType="decimal-pad"
                accessibilityLabel="Valor da doação em reais"
              />
            </View>
            <View style={styles.sugestoes}>
              {SUGESTOES_DOACAO.map((valor) => (
                <TouchableOpacity
                  key={valor}
                  style={[
                    styles.sugestao,
                    valorDoacao === valor && styles.sugestaoSelecionada,
                  ]}
                  onPress={() => {
                    setValorDoacao(valor);
                    setErroValor("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Doar R$ ${valor.replace(",", ".")}`}
                >
                  <Text
                    style={[
                      styles.textoSugestao,
                      valorDoacao === valor && styles.textoSugestaoSelecionada,
                    ]}
                  >
                    R$ {valor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!erroValor && (
              <Text style={styles.erroValor} accessibilityRole="alert">
                {erroValor}
              </Text>
            )}
          </View>

          {campanha && (
            <TouchableOpacity
              style={[styles.botao, !ativa && styles.botaoDesativado]}
              onPress={contribuir}
              disabled={!ativa || iniciandoDoacao}
              accessibilityRole="button"
            >
              {iniciandoDoacao ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.botaoTexto}>
                  {ativa ? "Continuar para pagamento" : "Campanha indisponível"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    alignItems: "center",
    backgroundColor: FUNDO,
  },
  tela: {
    flex: 1,
    maxWidth: 460,
  },
  conteudo: {
    flexGrow: 1,
    paddingBottom: 92,
  },
  imagem: {
    width: "100%",
    height: 250,
    backgroundColor: "#E6EADD",
  },
  imagemVazia: {
    alignItems: "center",
    justifyContent: "center",
  },
  voltar: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 21,
    backgroundColor: "#E6F0DF",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    marginTop: -24,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  titulo: {
    color: VERDE,
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    lineHeight: 27,
  },
  descricao: {
    color: "#686868",
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 3,
  },
  prazo: {
    color: VERDE,
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    marginTop: 9,
  },
  informacao: {
    color: "#686868",
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 6,
  },
  meta: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFD8C6",
    backgroundColor: "#EEF4E5",
  },
  metaTitulo: {
    color: "#686868",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  metaTexto: {
    color: "#686868",
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  valorArea: {
    marginHorizontal: 24,
    marginTop: 16,
  },
  valorRotulo: {
    color: VERDE,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    marginBottom: 6,
  },
  campoValor: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#CFD8C6",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  prefixoValor: {
    color: "#686868",
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    marginRight: 8,
  },
  valorInput: {
    flex: 1,
    paddingVertical: 8,
    color: "#252B25",
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
  },
  sugestoes: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  sugestao: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CFD8C6",
    borderRadius: 18,
    backgroundColor: "#EEF4E5",
  },
  sugestaoSelecionada: {
    borderColor: VERDE,
    backgroundColor: "#DDEBD4",
  },
  textoSugestao: {
    color: VERDE,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  textoSugestaoSelecionada: {
    fontFamily: "Poppins_700Bold",
  },
  erroValor: {
    color: "#B42318",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  botao: {
    minHeight: 46,
    marginHorizontal: 28,
    marginTop: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: VERDE,
    elevation: 3,
  },
  botaoDesativado: {
    backgroundColor: "#AEB5AA",
  },
  botaoTexto: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
  },
});