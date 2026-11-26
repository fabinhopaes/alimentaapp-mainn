import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MenuInferior from "../components/MenuInferior";
import { auth } from "../firebase";
import { db } from "../firebaseDb";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  criarDestinoDoacao,
  filtrarDoacoes,
  FILTROS_DOACOES,
  ordenarDoacoes,
  statusDoacaoValido,
} from "../utils/doacoes";

const VERDE = "#006838";
const VERDE_CLARO = "#E9F4E2";
const FUNDO = "#F7F5EF";
const BRANCO = "#FFFFFF";
const TEXTO = "#1D2A1F";
const CINZA = "#6F766F";
const BORDA = "#D9DDD4";
const AMARELO_STATUS = "#EFE7B4";
const SOMBRA = "#000000";

function formatarData(valor) {
  const data = valor?.toDate
    ? valor.toDate()
    : valor
      ? new Date(valor)
      : null;

  if (!data || Number.isNaN(data.getTime())) {
    return "Data indisponível";
  }

  return data.toLocaleDateString("pt-BR");
}

function formatarValorDoacao(doacao) {
  if (doacao.tipoDoacao === "campanha") {
    const total = Number(doacao.total ?? doacao.precoAtual ?? 0);
    return `R$ ${total.toFixed(2).replace(".", ",")}`;
  }

  const quantidade = Number(
    doacao.tipoDoacao === "agrupada"
      ? doacao.quantidadeItens ?? doacao.itens?.length ?? doacao.quantidade
      : doacao.quantidade
  );
  const unidade = doacao.tipoDoacao === "agrupada"
    ? "itens"
    : doacao.unidade || "unidades";
  return `${Number.isFinite(quantidade) ? quantidade : 0} ${unidade}`;
}

export default function TelaMinhasDoacoes({ navigation }) {
  const [filtro, setFiltro] = useState("Todas");
  const [doacoesFirestore, setDoacoesFirestore] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setCarregando(false);
      setErro("Faça login novamente para consultar suas doações.");
      return undefined;
    }

    return onSnapshot(
      query(
        collection(db, "minhasDoacoes"),
        where("criadoPor", "==", uid)
      ),
      (snapshot) => {
        const doacoes = snapshot.docs.map((registro) => {
          const dados = registro.data();
          const doacao = {
            ...dados,
            id: registro.id,
            doacaoId: registro.id,
          };
          const status = statusDoacaoValido(doacao);
          const monetaria = doacao.tipoDoacao === "campanha";

          return {
            ...doacao,
            status,
            tipo: monetaria ? "dinheiro" : "alimento",
            instituicao: monetaria
              ? "Campanha de doação"
              : doacao.estabelecimento || "Alimenta+",
            data: formatarData(doacao.criadoEm),
            valorFormatado: formatarValorDoacao(doacao),
          };
        });

        setDoacoesFirestore(doacoes);
        setCarregando(false);
        setErro("");
      },
      (e) => {
        console.error("Erro ao consultar minhas doações:", e);
        setCarregando(false);
        setErro(
          e.code === "permission-denied"
            ? "O Firestore bloqueou a consulta. Confira as regras de leitura das suas doações."
            : "Não foi possível carregar suas doações."
        );
      }
    );
  }, [uid]);

  const doacoesFiltradas = useMemo(() => {
    return ordenarDoacoes(
      filtrarDoacoes(doacoesFirestore, filtro),
      "Mais recentes"
    );
  }, [filtro, doacoesFirestore]);

  function renderBotaoFiltro(label) {
    const ativo = filtro === label;

    return (
      <TouchableOpacity
        key={label}
        style={[styles.botaoFiltro, ativo && styles.botaoFiltroAtivo]}
        onPress={() => setFiltro(label)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.textoFiltro,
            ativo && styles.textoFiltroAtivo,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color={VERDE} />
          </TouchableOpacity>

          <Text style={styles.titulo}>Minhas doações</Text>
        </View>

        <View style={styles.linhaFiltros}>
          {FILTROS_DOACOES.map(renderBotaoFiltro)}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {carregando && (
            <ActivityIndicator color={VERDE} style={{ marginTop: 24 }} />
          )}
          {!carregando && doacoesFiltradas.length === 0 && (
            <Text style={styles.vazio}>
              {erro || "Nenhuma doação válida encontrada."}
            </Text>
          )}

          {doacoesFiltradas.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => {
                const destino = criarDestinoDoacao(item);
                if (!destino) {
                  Alert.alert(
                    "Não foi possível abrir a doação",
                    "Revise os dados de pagamento desta doação e tente novamente."
                  );
                  return;
                }
                navigation.navigate(destino.name, destino.params);
              }}
            >
              <View style={styles.cardEsquerda}>
                <Ionicons
                  name={item.tipo === "dinheiro" ? "cash-outline" : "nutrition-outline"}
                  size={42}
                  color={VERDE}
                />
              </View>

              <View style={styles.cardCentro}>
                <Text style={styles.nomeProduto}>{item.nome}</Text>
                <Text style={styles.instituicao}>{item.instituicao}</Text>
                <Text style={styles.meta}>
                  {item.data} •{" "}
                  {item.valorFormatado}
                </Text>

                <View
                  style={[
                    styles.statusWrap,
                    item.status === "Em andamento"
                      ? styles.statusWrapAndamento
                      : styles.statusWrapConcluida,
                  ]}
                >
                  <Text style={styles.statusTexto}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.cardDireita}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#9AA09A"
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <MenuInferior navigation={navigation} ativo="doacoes" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: FUNDO,
  },

  container: {
    flex: 1,
    backgroundColor: FUNDO,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },

  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: VERDE_CLARO,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  titulo: {
    fontSize: 21,
    color: VERDE,
    fontFamily: "Poppins_700Bold",
  },

  linhaFiltros: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  botaoFiltro: {
    minWidth: 84,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDA,
    backgroundColor: BRANCO,
    alignItems: "center",
    justifyContent: "center",
  },

  botaoFiltroAtivo: {
    backgroundColor: VERDE,
    borderColor: VERDE,
  },

  textoFiltro: {
    fontSize: 11,
    color: "#6E716E",
    fontFamily: "Poppins_500Medium",
  },

  textoFiltroAtivo: {
    color: BRANCO,
    fontFamily: "Poppins_600SemiBold",
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 18,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRANCO,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D8DDD6",
    padding: 14,
    marginBottom: 16,
    shadowColor: SOMBRA,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  cardEsquerda: {
    marginRight: 12,
  },

  cardCentro: {
    flex: 1,
  },

  nomeProduto: {
    fontSize: 18,
    lineHeight: 24,
    color: VERDE,
    fontFamily: "Poppins_700Bold",
    marginBottom: 1,
  },

  instituicao: {
    fontSize: 13,
    color: CINZA,
    fontFamily: "Poppins_400Regular",
    marginBottom: 3,
  },

  meta: {
    fontSize: 14,
    color: VERDE,
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
  },

  statusWrap: {
    alignSelf: "flex-start",
    backgroundColor: AMARELO_STATUS,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  statusWrapAndamento: {
    backgroundColor: VERDE_CLARO,
  },
  statusWrapConcluida: {
    backgroundColor: AMARELO_STATUS,
  },

  statusTexto: {
    fontSize: 11,
    color: "#5B6A35",
    fontFamily: "Poppins_600SemiBold",
  },

  cardDireita: {
    marginLeft: 8,
  },

})