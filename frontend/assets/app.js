/* ======= Tema ======= */
const body = document.body;
const savedTheme = localStorage.getItem('theme');
if (savedTheme) body.className = savedTheme;
const btnTheme = document.getElementById('btnTheme');
const toggleThemeBtn = document.getElementById('toggleTheme');
function toggleTheme(){
  body.classList.toggle('theme-dark');
  body.classList.toggle('theme-light');
  localStorage.setItem('theme', body.className);
}
btnTheme && btnTheme.addEventListener('click', toggleTheme);
toggleThemeBtn && toggleThemeBtn.addEventListener('click', toggleTheme);

/* ======= Gavetas ======= */
const backdrop = document.getElementById('backdrop');
function openDrawer(id){ document.getElementById(id).classList.add('show'); backdrop.classList.add('show'); }
function closeDrawer(id){ document.getElementById(id).classList.remove('show'); if(!document.querySelector('.drawer.show')) backdrop.classList.remove('show'); }

document.querySelectorAll('[data-close]').forEach(b=>{
  b.addEventListener('click',()=> closeDrawer(b.dataset.close));
});
backdrop && backdrop.addEventListener('click', ()=>{
  document.querySelectorAll('.drawer.show').forEach(d=>d.classList.remove('show'));
  backdrop.classList.remove('show');
});

const btnMenu = document.getElementById('btnMenu');
btnMenu && btnMenu.addEventListener('click', ()=> openDrawer('drawerMenu'));

/* ======= Catálogo e Carrinho ======= */
const PRODUTOS = [
  {id:'p01', nome:'Pão Bisnaguinha Tradicional Qualita Pacote 300g', preco:6.99, emoji:'🥖'},
  {id:'p02', nome:'Requeijão Cremoso TIROLEZ Copo 200g', preco:8.19, emoji:'🧀'},
  {id:'p03', nome:'Suco Uva e Maçã Natural One 900ml', preco:14.44, emoji:'🧃'},
  {id:'p04', nome:'Coca-Cola Orig e Fanta 2l cada', preco:19.49, emoji:'🥤'},
  {id:'p05', nome:'Leite UHT Integral 1L', preco:4.89, emoji:'🥛'},
  {id:'p06', nome:'Contra Filé em Bife Bandeja 600g', preco:38.34, emoji:'🥩'},
  {id:'p07', nome:'Pizza Napolitana Perdigão 460g', preco:18.29, emoji:'🍕'},
  {id:'p08', nome:'Cerveja Heineken Lata Sleek 350ml', preco:5.99, emoji:'🍺'},
];

function loadCart(){
  try{ return JSON.parse(localStorage.getItem('cart')||'{}'); }catch{ return {}; }
}
function saveCart(cart){ localStorage.setItem('cart', JSON.stringify(cart)); }
function addToCart(id){
  const cart = loadCart();
  cart[id] = (cart[id]||0)+1;
  saveCart(cart);
  renderLista();
}
function changeQty(id, delta){
  const cart = loadCart();
  cart[id] = Math.max(0, (cart[id]||0)+delta);
  if(cart[id]===0) delete cart[id];
  saveCart(cart); renderLista();
}
function removeItem(id){
  const cart = loadCart(); delete cart[id]; saveCart(cart); renderLista();
}
function clearCart(){ saveCart({}); renderLista(); }

/* ======= Grid de Produtos (Ofertas) ======= */
const grid = document.getElementById('gridProdutos');
if (grid){
  grid.innerHTML = PRODUTOS.map(p=>`
    <article class="card">
      <div class="card-thumb">${p.emoji}</div>
      <div class="card-title">${p.nome}</div>
      <div class="card-price">R$ ${p.preco.toFixed(2).replace('.', ',')}</div>
      <button class="btn-fab" aria-label="adicionar" data-add="${p.id}">＋</button>
    </article>
  `).join('');
  grid.addEventListener('click', (e)=>{
    const id = e.target.dataset.add;
    if (id) addToCart(id);
  });
}

/* ======= Gaveta Minha Lista ======= */
const btnLista = document.getElementById('btnLista');
btnLista && btnLista.addEventListener('click', ()=> openDrawer('drawerLista'));

const listaItens = document.getElementById('listaItens');
function renderLista(){
  if (!listaItens) return;
  const cart = loadCart();
  const ids = Object.keys(cart);
  if (ids.length===0){
    listaItens.innerHTML = `<p>Seu carrinho está vazio.</p>`;
    return;
  }
  listaItens.innerHTML = ids.map(id=>{
    const p = PRODUTOS.find(x=>x.id===id) || {nome:'Item', preco:0, emoji:'🛍️'};
    const q = cart[id];
    return `
      <div class="list-item">
        <div>${p.emoji}</div>
        <div>
          <div style="font-weight:700">${p.nome}</div>
          <small>R$ ${p.preco.toFixed(2).replace('.', ',')}</small>
        </div>
        <div class="qty">
          <button aria-label="diminuir" data-qminus="${id}">−</button>
          <span>${q}</span>
          <button aria-label="aumentar" data-qplus="${id}">＋</button>
          <button class="rem" data-remove="${id}">remover</button>
        </div>
      </div>
    `;
  }).join('');
}
listaItens && listaItens.addEventListener('click', (e)=>{
  if (e.target.dataset.qplus)  changeQty(e.target.dataset.qplus, +1);
  if (e.target.dataset.qminus) changeQty(e.target.dataset.qminus, -1);
  if (e.target.dataset.remove) removeItem(e.target.dataset.remove);
});
const btnLimpar = document.getElementById('btnLimpar');
btnLimpar && btnLimpar.addEventListener('click', clearCart);
renderLista();

/* ======= Fechamento por tecla Esc ======= */
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    document.querySelectorAll('.drawer.show').forEach(d=>d.classList.remove('show'));
    backdrop && backdrop.classList.remove('show');
  }
});
