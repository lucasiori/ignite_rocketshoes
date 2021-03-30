import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const checkIsProductHasStock = async (productId: number, amount: number) => {
    const response = await api.get<Stock>(`stock/${productId}`)
    const { amount: stockAmount } = response.data

    return stockAmount >= amount
  }

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExists = cart.find((cartProduct) => {
        return cartProduct.id === productId
      })

      const productHasStock = await checkIsProductHasStock(
        productId,
        productAlreadyExists ? (productAlreadyExists.amount + 1) : 1 
      )

      if (!productHasStock) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      let newCart: Product[] = [];

      if (productAlreadyExists) {
        newCart = cart.map((product) => {
          const newAmount = product.id === productId 
            ? productAlreadyExists.amount + 1
            : product.amount

          return {
            ...product,
            amount: newAmount
          }
        })
      } else {
        const response = await api.get(`products/${productId}`)
        const product = response.data
  
        if (!product.id) {
          throw new Error()
        }

        newCart = [
          ...cart, 
          { ...product, amount: 1 }
        ]
      }

      setCart(newCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((cartProduct) => {
        return cartProduct.id === productId
      })

      if (!product) {
        throw new Error()
      }

      const newCart = cart.filter((cartProduct) => cartProduct.id !== productId)

      setCart(newCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return

    try {
      const product = cart.find((cartProduct) => {
        return cartProduct.id === productId
      })

      if (!product) {
        throw new Error()
      }

      const productHasStock = await checkIsProductHasStock(productId, amount)

      if (!productHasStock) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount
          }
        }

        return product
      })

      setCart(newCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
