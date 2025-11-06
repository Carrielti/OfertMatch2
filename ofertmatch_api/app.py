from flask import Flask, request, jsonify              # Importa Flask e utilitários para lidar com requests e respostas JSON
from flask_cors import CORS                            # Importa CORS para permitir chamadas do front-end (outras origens)
from pymongo import MongoClient, DESCENDING            # Importa cliente do MongoDB e constante de ordenação
from bson import ObjectId                              # Importa ObjectId para validar/converter IDs do Mongo
from dotenv import load_dotenv                         # Importa função para carregar variáveis do .env
import os                                              # Importa os utilitários do sistema operacional (para ler variáveis de ambiente)

# ===== CONFIGURAÇÃO =====
load_dotenv()                                          # Carrega variáveis do arquivo .env para o ambiente
app = Flask(__name__)                                  # Cria a aplicação Flask
CORS(app)                                              # Habilita CORS na aplicação (permite o front acessar a API)

MONGO_URI = os.environ.get("MONGO_URI")                # Lê a URI do MongoDB a partir da variável de ambiente MONGO_URI
MONGO_DB = os.environ.get("MONGO_DB", "ofertmatch")    # Lê o nome do banco (ou usa 'ofertmatch' como padrão)
client = MongoClient(MONGO_URI)                        # Cria um cliente do MongoDB usando a URI
db = client[MONGO_DB]                                  # Seleciona o banco de dados dentro do cluster

# ===== FUNÇÕES AUXILIARES =====
def serialize(doc):                                    # Define função para converter documentos do Mongo em JSON serializável
    doc["_id"] = str(doc["_id"])                       # Converte ObjectId para string
    return doc                                         # Retorna o documento modificado

def parse_pagination(req):                             # Define função para extrair paginação dos parâmetros da requisição
    try: page = max(1, int(req.args.get("page", 1)))   # Tenta ler 'page' (mínimo 1); se faltar, usa 1
    except: page = 1                                   # Em caso de erro na conversão, cai no padrão 1
    try: limit = max(1, min(100, int(req.args.get("limit", 10))))  # Lê 'limit' (entre 1 e 100); padrão 10
    except: limit = 10                                 # Em caso de erro na conversão, cai no padrão 10
    skip = (page - 1) * limit                          # Calcula o deslocamento (skip) para o Mongo
    return page, limit, skip                           # Retorna os três valores de paginação

def parse_query(req, fields):                          # Define função para montar filtro de busca textual
    q = (req.args.get("q") or "").strip()              # Lê o parâmetro 'q' e remove espaços extras
    if not q: return {}                                # Se não há termo de busca, retorna filtro vazio (sem restrição)
    return {"$or": [{f: {"$regex": q, "$options": "i"}} for f in fields]}  # Monta filtro OR com regex case-insensitive

# ========================= EMPRESAS =========================
@app.post("/api/empresas")                             # Define rota POST para criar empresa
def criar_empresa():                                   # Inicia handler da rota de criação
    data = request.get_json(silent=True) or {}         # Lê corpo JSON da requisição (ou dicionário vazio)
    obrig = ["razao_social", "cnpj", "endereco", "email", "responsavel"]  # Lista de campos obrigatórios
    if not all(data.get(k) for k in obrig):            # Verifica se todos os campos obrigatórios estão presentes/preenchidos
        return jsonify({"ok": False, "msg": "Campos obrigatórios faltando"}), 400  # Retorna erro 400 se faltar algo
    if db.empresas.find_one({"cnpj": data["cnpj"]}):   # Verifica se já existe empresa com o mesmo CNPJ
        return jsonify({"ok": False, "msg": "CNPJ já cadastrado"}), 409  # Retorna conflito 409 se CNPJ duplicado
    ins = db.empresas.insert_one(data)                 # Insere o documento na coleção 'empresas'
    return jsonify({"ok": True, "id": str(ins.inserted_id)}), 201  # Retorna sucesso com ID criado e status 201

@app.get("/api/empresas")                              # Define rota GET para listar empresas (com paginação e busca)
def listar_empresas():                                 # Inicia handler da listagem
    page, limit, skip = parse_pagination(request)      # Extrai paginação da querystring
    filtro = parse_query(request, ["razao_social", "cnpj", "endereco", "email", "responsavel"])  # Monta filtro de busca
    total = db.empresas.count_documents(filtro)        # Conta total de documentos que batem com o filtro
    cur = db.empresas.find(filtro).sort("_id", DESCENDING).skip(skip).limit(limit)  # Busca paginação ordenada por _id desc
    data = [serialize(x) for x in cur]                 # Serializa cada documento (converte _id)
    return jsonify({"ok": True, "data": data, "pagination": {"page": page, "limit": limit, "total": total}})  # Retorna JSON

@app.put("/api/empresas/<id>")                         # Define rota PUT para atualizar empresa por ID
def atualizar_empresa(id):                             # Inicia handler da atualização
    data = request.get_json(silent=True) or {}         # Lê corpo JSON (ou dicionário vazio)
    if not ObjectId.is_valid(id):                      # Valida se o ID tem formato de ObjectId
        return jsonify({"ok": False, "msg": "ID inválido"}), 400  # Retorna erro 400 se ID inválido
    res = db.empresas.update_one({"_id": ObjectId(id)}, {"$set": data})  # Faz atualização parcial com $set
    if res.matched_count == 0:                         # Verifica se encontrou documento para atualizar
        return jsonify({"ok": False, "msg": "Empresa não encontrada"}), 404  # Retorna 404 se não encontrou
    return jsonify({"ok": True, "msg": "Empresa atualizada"})  # Retorna sucesso

@app.delete("/api/empresas/<id>")                      # Define rota DELETE para excluir empresa por ID
def deletar_empresa(id):                               # Inicia handler da exclusão
    if not ObjectId.is_valid(id):                      # Valida o ID recebido
        return jsonify({"ok": False, "msg": "ID inválido"}), 400  # Retorna 400 se ID inválido
    res = db.empresas.delete_one({"_id": ObjectId(id)})# Executa exclusão na coleção
    if res.deleted_count == 0:                         # Verifica se alguma empresa foi excluída
        return jsonify({"ok": False, "msg": "Empresa não encontrada"}), 404  # Retorna 404 se não achou
    return jsonify({"ok": True, "msg": "Empresa excluída"})      # Retorna sucesso

# ========================= PRODUTOS =========================
@app.post("/api/produtos")                             # Define rota POST para criar produto
def criar_produto():                                   # Inicia handler de criação de produto
    data = request.get_json(silent=True) or {}         # Lê JSON do corpo (ou dicionário vazio)
    obrig = ["nome", "codigo", "estoque", "categoria", "marca", "valor"]  # Campos obrigatórios do produto
    if not all(str(data.get(k, "")).strip() != "" for k in obrig):        # Confere se todos foram informados (não vazios)
        return jsonify({"ok": False, "msg": "Campos obrigatórios faltando"}), 400  # Retorna 400 se faltar algo
    data["estoque"] = int(data.get("estoque", 0))      # Converte estoque para inteiro (ou 0)
    data["valor"] = float(data.get("valor", 0))        # Converte valor para float (ou 0.0)
    ins = db.produtos.insert_one(data)                 # Insere o produto no Mongo
    return jsonify({"ok": True, "id": str(ins.inserted_id)}), 201  # Retorna sucesso com ID criado

@app.get("/api/produtos")                              # Define rota GET para listar produtos
def listar_produtos():                                 # Inicia handler da listagem de produtos
    page, limit, skip = parse_pagination(request)      # Lê paginação da querystring
    filtro = parse_query(request, ["nome", "codigo", "categoria", "marca"])  # Monta filtro de busca textual
    total = db.produtos.count_documents(filtro)        # Conta o total que bate com o filtro
    cur = db.produtos.find(filtro).sort("_id", DESCENDING).skip(skip).limit(limit)  # Busca paginada ordenada
    data = [serialize(x) for x in cur]                 # Serializa cada documento (converte _id)
    return jsonify({"ok": True, "data": data, "pagination": {"page": page, "limit": limit, "total": total}})  # Resposta JSON

@app.put("/api/produtos/<id>")                         # Define rota PUT para atualizar produto por ID
def atualizar_produto(id):                             # Inicia handler da atualização
    data = request.get_json(silent=True) or {}         # Lê corpo JSON (ou vazio)
    if not ObjectId.is_valid(id):                      # Valida o ID
        return jsonify({"ok": False, "msg": "ID inválido"}), 400  # Retorna 400 se inválido
    res = db.produtos.update_one({"_id": ObjectId(id)}, {"$set": data})  # Atualiza campos informados
    if res.matched_count == 0:                         # Se nada foi encontrado para atualizar
        return jsonify({"ok": False, "msg": "Produto não encontrado"}), 404  # Retorna 404
    return jsonify({"ok": True, "msg": "Produto atualizado"})  # Retorna sucesso

@app.delete("/api/produtos/<id>")                      # Define rota DELETE para excluir produto por ID
def deletar_produto(id):                               # Inicia handler da exclusão
    if not ObjectId.is_valid(id):                      # Valida o ID
        return jsonify({"ok": False, "msg": "ID inválido"}), 400  # Retorna 400 se inválido
    res = db.produtos.delete_one({"_id": ObjectId(id)})# Executa exclusão na coleção
    if res.deleted_count == 0:                         # Checa se algo foi excluído
        return jsonify({"ok": False, "msg": "Produto não encontrado"}), 404  # Retorna 404 se nada excluído
    return jsonify({"ok": True, "msg": "Produto excluído"})      # Retorna sucesso

# ========================= OFERTAS =========================
@app.post("/api/ofertas")                              # Define rota POST para criar oferta
def criar_oferta():                                    # Inicia handler de criação de oferta
    data = request.get_json(silent=True) or {}         # Lê JSON do corpo
    obrig = ["produto", "marca", "codigo", "estoque", "categoria", "valor"]  # Campos obrigatórios da oferta
    if not all(str(data.get(k, "")).strip() != "" for k in obrig):          # Valida se todos foram informados
        return jsonify({"ok": False, "msg": "Campos obrigatórios faltando"}), 400  # Retorna 400 se faltar algo
    data["estoque"] = int(data.get("estoque", 0))      # Converte estoque para inteiro
    data["valor"] = float(data.get("valor", 0))        # Converte valor para float
    ins = db.ofertas.insert_one(data)                  # Insere a oferta no Mongo
    return jsonify({"ok": True, "id": str(ins.inserted_id)}), 201  # Retorna sucesso com ID criado

@app.get("/api/ofertas")                               # Define rota GET para listar ofertas
def listar_ofertas():                                  # Inicia handler de listagem de ofertas
    page, limit, skip = parse_pagination(request)      # Extrai paginação
    filtro = parse_query(request, ["produto", "marca", "codigo", "categoria"])  # Filtro de busca textual
    total = db.ofertas.count_documents(filtro)         # Conta o total filtrado
    cur = db.ofertas.find(filtro).sort("_id", DESCENDING).skip(skip).limit(limit)  # Busca paginada ordenada
    data = [serialize(x) for x in cur]                 # Serializa documentos retornados
    return jsonify({"ok": True, "data": data, "pagination": {"page": page, "limit": limit, "total": total}})  # Resposta JSON

@app.put("/api/ofertas/<id>")                          # Define rota PUT para atualizar oferta por ID
def atualizar_oferta(id):                              # Inicia handler de atualização de oferta
    data = request.get_json(silent=True) or {}         # Lê o JSON do corpo (ou vazio)
    if not ObjectId.is_valid(id):                      # Valida o ID
        return jsonify({"ok": False, "msg": "ID inválido"}), 400  # Retorna 400 se inválido
    res = db.ofertas.update_one({"_id": ObjectId(id)}, {"$set": data})  # Atualiza campos informados
    if res.matched_count == 0:                         # Verifica se encontrou o documento
        return jsonify({"ok": False, "msg": "Oferta não encontrada"}), 404  # Retorna 404 se não achou
    return jsonify({"ok": True, "msg": "Oferta atualizada"})  # Retorna sucesso

@app.delete("/api/ofertas/<id>")                       # Define rota DELETE para excluir oferta por ID
def deletar_oferta(id):                                # Inicia handler da exclusão
    if not ObjectId.is_valid(id):                      # Valida o ID recebido
        return jsonify({"ok": False, "msg": "ID inválido"}), 400  # Retorna 400 se inválido
    res = db.ofertas.delete_one({"_id": ObjectId(id)}) # Executa exclusão
    if res.deleted_count == 0:                         # Verifica se algo foi excluído
        return jsonify({"ok": False, "msg": "Oferta não encontrada"}), 404  # Retorna 404 se não achou
    return jsonify({"ok": True, "msg": "Oferta excluída"})       # Retorna sucesso

@app.get("/api/health")                                # Define rota GET simples para checagem de saúde da API
def health():                                          # Inicia handler da rota de saúde
    return jsonify({"ok": True, "service": "ofertmatch-api"})  # Retorna status OK e nome do serviço

if __name__ == "__main__":                             # Garante execução apenas se este arquivo for o principal
    import os
    port = int(os.environ.get("PORT", 5000))                 # Sobe o servidor Flask acessível na rede local, porta 5000
    app.run(host="0.0.0.0", port=port)
