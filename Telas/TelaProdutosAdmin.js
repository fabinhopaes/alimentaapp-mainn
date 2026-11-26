import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth } from "../firebase";
import { db } from "../firebaseDb";
import {
  FILTROS_PRODUTO,
  filtrarProdutosAdmin,
} from "../utils/produtosAdmin";

const VERDE = "#006838";
const FUNDO = "#FFFCF6";

function formatarPreco(valor) {
  if (!Number.isFinite(Number(valor))) return "";
  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
}

function coresStatus(ativo) {
  return ativo
    ? { fundo: "#A8E8B9", texto: "#157C43", rotulo: "Disponível" }
    : { fundo: "#DDDDDD", texto: "#444444", rotulo: "Indisponível" };
}

export default function TelaProdutosAdmin({ navigation }) {
  const { width } = useWindowDimensions();
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [abrirFiltros, setAbrirFiltros] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");

  useEffect(() => onSnapshot(
    collection(db, "alimentos"),
    (snapshot) => {
      const lista = snapshot.docs.map((registro) => ({
        id: registro.id,
        ...registro.data(),
      }));
      setProdutos(lista);
      setCarregando(false);
      setErro("");
    },
    (e) => {
      console.error("Erro ao consultar produtos:", e);
      setCarregando(false);
      setErro(
        e.code === "permission-denied"
          ? "Sem permissão para consultar os produtos. Confira as regras do Firestore."
          : "Não foi possível carregar os produtos cadastrados."
      );
    }
  ), []);

  const lista = useMemo(
    () => filtrarProdutosAdmin(produtos, busca, filtro),
    [produtos, busca, filtro]
  );

  async function verificarAdministrador() {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error("Sua sessão expirou. Entre novamente.");
    const token = await usuario.getIdTokenResult(true);
    if (token?.claims?.admin !== true) {
      throw new Error("Sua conta não possui permissão administrativa.");
    }
  }

  async function alterarStatus(produto) {
    if (ocupado) return;
    const status = produto.status === "disponivel" ? "indisponivel" : "disponivel";
    setOcupado(produto.id);
    try {
      await verificarAdministrador();
      await updateDoc(doc(db, "alimentos", produto.id), {
        status,
        atualizadoEm: serverTimestamp(),
      });
    } catch (e) {
      console.error("Erro ao alterar status do produto:", e);
      Alert.alert(
        "Não foi possível atualizar",
        e.code === "permission-denied"
          ? "O Firestore bloqueou a alteração. Publique as regras atualizadas."
          : e.message || "Tente novamente."
      );
    } finally {
      setOcupado("");
    }
  }

  async function excluirProduto(produto) {
    if (ocupado) return;
    setOcupado(produto.id);
    try {
      await verificarAdministrador();
      await deleteDoc(doc(db, "alimentos", produto.id));
    } catch (e) {
      console.error("Erro ao excluir produto:", e);
      const mensagem = e.code === "permission-denied"
        ? "O Firestore bloqueou a exclusão. Publique as regras atualizadas."
        : e.message || "Tente novamente.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`Não foi possível excluir: ${mensagem}`);
      } else {
        Alert.alert("Não foi possível excluir", mensagem);
      }
    } finally {
      setOcupado("");
    }
  }

  function confirmarExclusao(produto) {
    const mensagem = `Deseja excluir "${produto.nome}"? Esta ação não pode ser desfeita.`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(mensagem)) {
        void excluirProduto(produto);
      }
      return;
    }

    Alert.alert(
      "Excluir produto",
      mensagem,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => excluirProduto(produto) },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.painel, { width: Math.min(width, 460) }]}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topo}>
            <TouchableOpacity style={styles.voltar} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={VERDE} />
            </TouchableOpacity>
            <Text style={styles.titulo}>Produtos</Text>
          </View>
          <Text style={styles.subtitulo}>Acompanhe e gerencie os produtos cadastrados.</Text>

          <View style={styles.ferramentas}>
            <View style={styles.busca}>
              <Ionicons name="search-outline" size={18} color="#888888" />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar produto..."
                placeholderTextColor="#999999"
                style={styles.inputBusca}
              />
            </View>
            <TouchableOpacity
              style={styles.filtro}
              onPress={() => setAbrirFiltros(!abrirFiltros)}
            >
              <Text style={styles.filtroTexto}>{filtro}</Text>
              <Ionicons name="chevron-down" size={18} />
            </TouchableOpacity>
          </View>
          {abrirFiltros && (
            <View style={styles.menuFiltro}>
              {FILTROS_PRODUTO.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.itemFiltro}
                  onPress={() => {
                    setFiltro(item);
                    setAbrirFiltros(false);
                  }}
                >
                  <Text style={{ color: item === filtro ? VERDE : "#333333" }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {carregando && <ActivityIndicator color={VERDE} style={{ marginTop: 20 }} />}
          {!!erro && <Text style={styles.aviso}>{erro}</Text>}

          {lista.map((produto) => {
            const ativo = produto.status === "disponivel";
            const esgotado = Number(produto.quantidade) === 0;
            const status = coresStatus(ativo);
            const imagem = produto.imagemAdminDefinida === true
              ? produto.imagemUrl
              : "";
            const itemOcupado = ocupado === produto.id;
            return (
              <View key={produto.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.conteudoCard}
                  onPress={() => navigation.navigate("TelaCriarProdutoAdmin", { produto })}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${produto.nome}`}
                >
                  {typeof imagem === "string" && /^https:\/\//i.test(imagem) ? (
                    <Image source={{ uri: imagem }} style={styles.imagem} resizeMode="cover" />
                  ) : (
                    <View style={[styles.imagem, styles.imagemVazia]}>
                      <Ionicons name="image-outline" size={27} color={VERDE} />
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text numberOfLines={2} style={styles.nome}>{produto.nome || "Produto sem nome"}</Text>
                    <Text numberOfLines={2} style={styles.desc}>
                      {produto.descricao || produto.categoria || "Sem descrição"}
                    </Text>
                    {!!formatarPreco(produto.precoAtual) && (
                      <Text style={styles.preco}>{formatarPreco(produto.precoAtual)}</Text>
                    )}
                  </View>
                  <View style={[styles.status, { backgroundColor: status.fundo }]}>
                    <Text style={[styles.statusTexto, { color: status.texto }]}>{status.rotulo}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.acoes}>
                  <TouchableOpacity
                    style={styles.acao}
                    onPress={() => navigation.navigate("TelaCriarProdutoAdmin", { produto })}
                    accessibilityLabel={`Editar ${produto.nome}`}
                  >
                    <Ionicons name="create-outline" size={19} color={VERDE} />
                    <Text style={styles.acaoTexto}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acao}
                    onPress={() => esgotado
                      ? navigation.navigate("TelaCriarProdutoAdmin", { produto })
                      : alterarStatus(produto)}
                    disabled={Boolean(ocupado)}
                    accessibilityLabel={esgotado
                      ? "Repor estoque do produto"
                      : ativo ? "Desativar produto" : "Ativar produto"}
                  >
                    {itemOcupado ? (
                      <ActivityIndicator size="small" color={VERDE} />
                    ) : (
                      <Ionicons
                        name={esgotado
                          ? "add-circle-outline"
                          : ativo ? "pause-circle-outline" : "play-circle-outline"}
                        size={19}
                        color={VERDE}
                      />
                    )}
                    <Text style={styles.acaoTexto}>
                      {esgotado ? "Repor estoque" : ativo ? "Desativar" : "Ativar"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acao}
                    onPress={() => confirmarExclusao(produto)}
                    disabled={Boolean(ocupado)}
                    accessibilityLabel={`Excluir ${produto.nome}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#B3261E" />
                    <Text style={[styles.acaoTexto, { color: "#B3261E" }]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {!carregando && !erro && lista.length === 0 && (
            <Text style={styles.aviso}>Nenhum produto encontrado.</Text>
          )}

          <TouchableOpacity
            style={styles.novo}
            onPress={() => navigation.navigate("TelaCriarProdutoAdmin")}
          >
            <Ionicons name="add" color="#FFFFFF" size={20} />
            <Text style={styles.novoTexto}>Novo produto</Text>
          </TouchableOpacity>
          <Text style={styles.observacao}>
            Os produtos e seus status são atualizados em tempo real no catálogo dos usuários.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: FUNDO, alignItems: "center" },
  painel: { flex: 1, maxWidth: 460 },
  conteudo: { padding: 17, paddingBottom: 42 },
  topo: { flexDirection: "row", alignItems: "center", gap: 10 },
  voltar: {
    height: 38, width: 38, borderRadius: 19, backgroundColor: "#E8EEE0",
    justifyContent: "center", alignItems: "center",
  },
  titulo: { color: VERDE, fontFamily: "Poppins_700Bold", fontSize: 20 },
  subtitulo: {
    fontFamily: "Poppins_400Regular", fontSize: 15, color: "#666666",
    lineHeight: 22, marginTop: 9, marginBottom: 12,
  },
  ferramentas: { flexDirection: "row", gap: 8, marginBottom: 11 },
  busca: {
    flex: 1, minWidth: 0, backgroundColor: "#FFFFFF", borderRadius: 8,
    borderWidth: 1, borderColor: "#DDDDDD", height: 43, alignItems: "center",
    paddingHorizontal: 10, flexDirection: "row", gap: 7,
  },
  inputBusca: { flex: 1, fontSize: 11, fontFamily: "Poppins_400Regular" },
  filtro: {
    maxWidth: "42%", minWidth: 100, height: 43, backgroundColor: "#FFFFFF",
    borderRadius: 8, borderColor: "#DDDDDD", borderWidth: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  filtroTexto: { fontSize: 11, flexShrink: 1 },
  menuFiltro: {
    borderColor: "#DDDDDD", borderWidth: 1, backgroundColor: "#FFFFFF",
    borderRadius: 8, marginBottom: 10,
  },
  itemFiltro: { padding: 11, borderBottomWidth: 1, borderColor: "#EEEEEE" },
  card: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E1E1",
    borderRadius: 10, padding: 7, marginBottom: 10,
  },
  conteudoCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 8 },
  imagem: { width: 78, height: 72, backgroundColor: "#F2F2EE", borderRadius: 7 },
  imagemVazia: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, minWidth: 0 },
  nome: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#222222" },
  desc: { fontFamily: "Poppins_400Regular", fontSize: 10, lineHeight: 14, color: "#555555" },
  preco: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: VERDE, marginTop: 2 },
  status: { borderRadius: 15, paddingHorizontal: 8, paddingVertical: 5, alignSelf: "flex-start" },
  statusTexto: { fontSize: 9, fontFamily: "Poppins_600SemiBold" },
  acoes: {
    borderTopWidth: 1, borderColor: "#EEEEEE", marginTop: 7, paddingTop: 5,
    flexDirection: "row", justifyContent: "space-around",
  },
  acao: { minHeight: 31, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 5 },
  acaoTexto: { fontFamily: "Poppins_500Medium", fontSize: 10, color: VERDE },
  novo: {
    marginTop: 16, backgroundColor: "#389A27", borderRadius: 8, minHeight: 48,
    alignSelf: "center", paddingHorizontal: 33, justifyContent: "center",
    alignItems: "center", gap: 9, flexDirection: "row",
  },
  novoTexto: { color: "#FFFFFF", fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  aviso: { fontSize: 12, color: "#B3261E", marginVertical: 12, textAlign: "center" },
  observacao: {
    fontSize: 10, color: "#777777", textAlign: "center", marginTop: 16, lineHeight: 16,
  },
});
