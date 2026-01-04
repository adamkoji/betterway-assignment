// 1. CONTEXT SETUP
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
        const existingItem = cartItems.find(item => item.id === product.id);
        const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    
        // Check if adding exceeds stock
        if (currentQtyInCart >= product.stock) {
            alert("This item is out of stock!");
            return;
        }
    
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    
        alert("Added to the cart!");
    };
    
    const updateQuantity = (id, newQty) => {
        const item = cartItems.find(i => i.id === id);
        if (!item) return;
    
        // If user tries to increase via '+' button beyond stock
        if (newQty > item.quantity && newQty > item.stock) {
            alert("This item is out of stock!");
            return;
        }
    
        setCartItems(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(1, Math.min(newQty, item.stock)) } : item
        ));
    };

    const removeFromCart = (id) => {
        setCartItems(prev => prev.filter(item => item.id !== id));
    };

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // CRITICAL: This return statement was missing, causing the blank screen
    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
}

const useCart = () => React.useContext(CartContext);

// 2. COMPONENTS
const ProductCard = React.memo(({ product }) => {
    const { addToCart } = useCart();
    return (
        <div className="product-card">
            <img src={product.thumbnail} className="product-image" alt={product.title} />
            <h3 className="product-title">{product.title}</h3>
            <p className="product-price">${product.price}</p>
            <p className="product-category">{product.category}</p>
            <p style={{color: product.stock > 0 ? 'green' : 'red', fontSize: '0.8rem', marginBottom: '10px'}}>
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
            </p>
            <button className="add-to-cart" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
        </div>
    );
});

function Cart({ isOpen, onClose }) {
    const { cartItems, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();
    return (
        <div className={`cart-overlay ${isOpen ? 'open' : ''}`}>
            <div className="cart-header">
                <h2>Your Cart ({totalItems})</h2>
                <button onClick={onClose} style={{border:'none', background:'none', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
            </div>
            {cartItems.length === 0 ? <p style={{marginTop:'20px'}}>Your cart is empty.</p> : (
                <div style={{marginTop:'20px', height: 'calc(100% - 150px)', overflowY: 'auto'}}>
                    {cartItems.map(item => (
                        <div key={item.id} className="cart-item">
                            <img src={item.thumbnail} alt={item.title} />
                            <div style={{flex:1}}>
                                <p style={{fontWeight:'bold', fontSize:'0.9rem'}}>{item.title}</p>
                                <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'5px'}}>
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}>Remove</button>
                        </div>
                    ))}
                    <div style={{borderTop:'1px solid #eee', marginTop:'20px', paddingTop:'20px'}}>
                        <h3>Total: ${totalPrice.toFixed(2)}</h3>
                    </div>
                </div>
            )}
        </div>
    );
}

// 3. MAIN APP
function App() {
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
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
            const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = category === 'all' || p.category === category;
            return matchSearch && matchCat;
        }).sort((a, b) => {
            if (sort === 'low') return a.price - b.price;
            if (sort === 'high') return b.price - a.price;
            return 0;
        });
    }, [products, searchTerm, category, sort]);

    if (loading) return <div style={{textAlign:'center', padding:'50px'}}>Loading ShopSphere...</div>;

    return (
        <div>
            <header className="header">
                <div className="header-content">
                    <h1>ShopSphere 🛒</h1>
                    <button className="cart-toggle" onClick={() => setIsCartOpen(true)}>
                        Cart ({totalItems})
                    </button>
                </div>
            </header>

            <div className="app-container">
                <div className="filter-bar">
                    <input className="search-input" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                    <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="default">Sort By</option>
                        <option value="low">Price: Low to High</option>
                        <option value="high">Price: High to Low</option>
                    </select>
                    <button className="clear-filters" onClick={() => {setSearchTerm(''); setCategory('all'); setSort('default');}}>Clear</button>
                </div>

                <div className="products-grid">
                    {filtered.map(p => <ProductCard key={p.id} product={p} />)}
                    {filtered.length === 0 && <p>No products found.</p>}
                </div>
            </div>

            <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
}

// 4. RENDER
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<CartProvider><App /></CartProvider>);