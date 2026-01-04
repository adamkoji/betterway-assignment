// 1. CART CONTEXT & PROVIDER
const CartContext = React.createContext();

function CartProvider({ children }) {
    const [cartItems, setCartItems] = React.useState(() => {
        const saved = localStorage.getItem('shopsphere-cart');
        return saved ? JSON.parse(saved) : [];
    });

    React.useEffect(() => {
        localStorage.setItem('shopsphere-cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, newQty) => {
        setCartItems(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(1, newQty) } : item
        ));
    };

    const removeFromCart = (id) => setCartItems(prev => prev.filter(item => item.id !== id));
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
}

const useCart = () => React.useContext(CartContext);

// 2. PRODUCT CARD COMPONENT
const ProductCard = React.memo(({ product }) => {
    const { addToCart, cartItems } = useCart();
    const [msg, setMsg] = React.useState(null);

    const handleAdd = () => {
        const inCart = cartItems.find(i => i.id === product.id);
        const currentQty = inCart ? inCart.quantity : 0;

        if (currentQty >= product.stock) {
            setMsg("Out of stock!");
        } else {
            addToCart(product);
            setMsg("Added to cart");
        }
        // Auto-remove notification after 2 seconds
        setTimeout(() => setMsg(null), 2000);
    };

    return (
        <div className="product-card">
            <div className="product-image-container">
                <img src={product.thumbnail} className="product-image" alt={product.title} />
                {msg && <div className="toast-overlay">{msg}</div>}
            </div>

            <h3 className="product-title">{product.title}</h3>
            <p className="product-price">${product.price}</p>
            <p className="product-category">{product.category}</p>
            <p style={{color: product.stock > 0 ? 'green' : 'red', fontSize: '0.8rem', marginBottom: '12px'}}>
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
            </p>
            
            <button className="add-to-cart" onClick={handleAdd} disabled={product.stock === 0}>
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
        </div>
    );
});

// 3. CART OVERLAY COMPONENT
function CartSidebar({ isOpen, onClose }) {
    const { cartItems, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();
    return (
        <div className={`cart-overlay ${isOpen ? 'open' : ''}`}>
            <div className="cart-header">
                <h2>Your Cart ({totalItems})</h2>
                <button onClick={onClose} style={{border:'none', background:'none', fontSize:'2rem', cursor:'pointer'}}>×</button>
            </div>
            {cartItems.length === 0 ? <p style={{marginTop:'30px', color: '#94a3b8'}}>Your cart is empty.</p> : (
                <div style={{marginTop:'20px', height: 'calc(100% - 160px)', overflowY: 'auto'}}>
                    {cartItems.map(item => (
                        <div key={item.id} className="cart-item">
                            <img src={item.thumbnail} alt={item.title} />
                            <div style={{flex:1}}>
                                <p style={{fontWeight:'bold', fontSize:'0.9rem'}}>{item.title}</p>
                                <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'8px'}}>
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                                </div>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} style={{color:'#ef4444', border:'none', background:'none', cursor:'pointer'}}>Remove</button>
                        </div>
                    ))}
                    <div style={{borderTop:'2px solid #f1f5f9', marginTop:'20px', paddingTop:'20px'}}>
                        <h3 style={{display:'flex', justifyContent:'space-between'}}>Total: <span>${totalPrice.toFixed(2)}</span></h3>
                    </div>
                </div>
            )}
        </div>
    );
}

// 4. MAIN APP
function App() {
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [category, setCategory] = React.useState('all');
    const [sort, setSort] = React.useState('default');
    const [isCartOpen, setIsCartOpen] = React.useState(false);
    const { totalItems } = useCart();

    React.useEffect(() => {
        fetch('https://dummyjson.com/products?limit=20')
            .then(res => res.json())
            .then(data => { setProducts(data.products); setLoading(false); });
    }, []);

    const categories = ['all', ...new Set(products.map(p => p.category))];
    const filtered = React.useMemo(() => {
        return products.filter(p => {
            const mSearch = p.title.toLowerCase().includes(search.toLowerCase());
            const mCat = category === 'all' || p.category === category;
            return mSearch && mCat;
        }).sort((a, b) => {
            if (sort === 'low') return a.price - b.price;
            if (sort === 'high') return b.price - a.price;
            return 0;
        });
    }, [products, search, category, sort]);

    if (loading) return <div style={{textAlign:'center', padding:'100px', fontSize:'1.5rem'}}>Loading ShopSphere...</div>;

    return (
        <div>
            <header className="header">
                <div className="header-content">
                    <h1>ShopSphere 🛒</h1>
                    <button className="cart-toggle" onClick={() => setIsCartOpen(true)}>Cart ({totalItems})</button>
                </div>
            </header>
            <div className="app-container">
                <div className="filter-bar">
                    <input className="search-input" placeholder="Search product name..." value={search} onChange={e => setSearch(e.target.value)} />
                    <select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                    <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="default">Default Sorting</option>
                        <option value="low">Price: Low to High</option>
                        <option value="high">Price: High to Low</option>
                    </select>
                    <button className="clear-filters" onClick={() => {setSearch(''); setCategory('all'); setSort('default');}}>Clear</button>
                </div>
                <div className="products-grid">
                    {filtered.map(p => <ProductCard key={p.id} product={p} />)}
                    {filtered.length === 0 && <p style={{gridColumn: '1/-1', textAlign:'center', marginTop: '40px'}}>No products found matching your search.</p>}
                </div>
            </div>
            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<CartProvider><App /></CartProvider>);
