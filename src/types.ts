export interface Product { id: string; name: string; sku: string; qty: number; price: number }
export interface Order { id: string; productId: string; qty: number; date: string }
export interface User { id: string; username: string; password: string; role: "admin" | "staff" }
