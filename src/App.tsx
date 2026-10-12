import { useState, FormEvent } from "react";
import { useLocal } from "./useLocal";
import type { Product, Order, User } from "./types";

type Tab = "Dashboard" | "Products" | "Orders" | "Users";
const TABS: Tab[] = ["Dashboard", "Products", "Orders", "Users"];
const id = () => crypto.randomUUID();
const seedUsers: User[] = [{ id: "u1", username: "admin", password: "admin", role: "admin" }];

export default function App() {
  const [users, setUsers] = useLocal<User[]>("ims.users", seedUsers);
  const [products, setProducts] = useLocal<Product[]>("ims.products", []);
  const [orders, setOrders] = useLocal<Order[]>("ims.orders", []);
  const [session, setSession] = useLocal<string | null>("ims.session", null);
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [err, setErr] = useState("");

  const me = users.find((u) => u.id === session);

  if (!me) {
    const login = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const u = users.find((x) => x.username === f.get("u") && x.password === f.get("p"));
      if (u) { setSession(u.id); setErr(""); } else setErr("Wrong username or password");
    };
    return (
      <div className="login">
        <form className="card" onSubmit={login}>
          <h1>Inventory</h1>
          <input name="u" placeholder="Username" required />
          <input name="p" type="password" placeholder="Password" required />
          {err && <p className="err">{err}</p>}
          <button>Log in</button>
          <small>First run: admin / admin</small>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <nav>
        <b className="brand">Inventory</b>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
        <button onClick={() => setSession(null)}>Logout</button>
      </nav>
      <main>
        <h2>{tab}</h2>
        {tab === "Dashboard" && <Dashboard products={products} orders={orders} />}
        {tab === "Products" && <Products products={products} setProducts={setProducts} />}
        {tab === "Orders" && <Orders products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} />}
        {tab === "Users" && <Users users={users} setUsers={setUsers} meId={me.id} />}
      </main>
    </div>
  );
}

function Dashboard({ products, orders }: { products: Product[]; orders: Order[] }) {
  const units = products.reduce((s, p) => s + p.qty, 0);
  const value = products.reduce((s, p) => s + p.qty * p.price, 0);
  const low = products.filter((p) => p.qty < 5).length;
  const stats: [string, string | number][] = [
    ["Products", products.length], ["Units in stock", units],
    ["Stock value", value.toFixed(2)], ["Low stock (<5)", low], ["Orders", orders.length],
  ];
  return (
    <div className="stats">
      {stats.map(([k, v]) => <div className="card stat" key={k}><span>{k}</span><b>{v}</b></div>)}
    </div>
  );
}

function Products({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [q, setQ] = useState("");
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setProducts([...products, { id: id(), name: String(f.get("name")), sku: String(f.get("sku")), qty: Number(f.get("qty")), price: Number(f.get("price")) }]);
    e.currentTarget.reset();
  };
  const shown = products.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <form className="card row" onSubmit={add}>
        <input name="name" placeholder="Name" required />
        <input name="sku" placeholder="SKU" required />
        <input name="qty" type="number" min="0" placeholder="Qty" required />
        <input name="price" type="number" min="0" step="0.01" placeholder="Price" required />
        <button>Add</button>
      </form>
      <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="scroll"><table>
        <thead><tr><th>Name</th><th>SKU</th><th>Qty</th><th>Price</th><th></th></tr></thead>
        <tbody>{shown.map((p) => (
          <tr key={p.id} className={p.qty < 5 ? "low" : ""}>
            <td>{p.name}</td><td>{p.sku}</td><td>{p.qty}</td><td>{p.price.toFixed(2)}</td>
            <td><button onClick={() => setProducts(products.filter((x) => x.id !== p.id))}>Delete</button></td>
          </tr>))}</tbody>
      </table></div>
    </>
  );
}

function Orders(props: { products: Product[]; setProducts: (p: Product[]) => void; orders: Order[]; setOrders: (o: Order[]) => void }) {
  const { products, setProducts, orders, setOrders } = props;
  const [err, setErr] = useState("");
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pid = String(f.get("product")), qty = Number(f.get("qty"));
    const p = products.find((x) => x.id === pid);
    if (!p) return setErr("Pick a product");
    if (qty > p.qty) return setErr(`Only ${p.qty} in stock`);
    setErr("");
    setProducts(products.map((x) => (x.id === pid ? { ...x, qty: x.qty - qty } : x)));
    setOrders([{ id: id(), productId: pid, qty, date: new Date().toLocaleString() }, ...orders]);
    e.currentTarget.reset();
  };
  const name = (pid: string) => products.find((p) => p.id === pid)?.name ?? "(deleted product)";
  return (
    <>
      <form className="card row" onSubmit={add}>
        <select name="product" defaultValue="">
          <option value="" disabled>Product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.qty})</option>)}
        </select>
        <input name="qty" type="number" min="1" placeholder="Qty" required />
        <button>Place order</button>
      </form>
      {err && <p className="err">{err}</p>}
      <div className="scroll"><table>
        <thead><tr><th>Date</th><th>Product</th><th>Qty</th></tr></thead>
        <tbody>{orders.map((o) => <tr key={o.id}><td>{o.date}</td><td>{name(o.productId)}</td><td>{o.qty}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}

function Users({ users, setUsers, meId }: { users: User[]; setUsers: (u: User[]) => void; meId: string }) {
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setUsers([...users, { id: id(), username: String(f.get("u")), password: String(f.get("p")), role: f.get("r") as User["role"] }]);
    e.currentTarget.reset();
  };
  return (
    <>
      <form className="card row" onSubmit={add}>
        <input name="u" placeholder="Username" required />
        <input name="p" placeholder="Password" required />
        <select name="r"><option value="staff">staff</option><option value="admin">admin</option></select>
        <button>Add</button>
      </form>
      <div className="scroll"><table>
        <thead><tr><th>User</th><th>Role</th><th></th></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}><td>{u.username}</td><td>{u.role}</td>
            <td>{u.id !== meId && <button onClick={() => setUsers(users.filter((x) => x.id !== u.id))}>Delete</button>}</td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
