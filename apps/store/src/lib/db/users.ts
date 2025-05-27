// Simulando um banco de dados em memória
// Em produção, isso seria substituído por um banco real

export interface User {
  id: string;
  email: string;
  password: string; // Em produção, seria um hash
  name: string;
  role: 'customer' | 'seller' | 'admin';
  createdAt: Date;
}

// Banco de dados em memória
export const users: User[] = [
  {
    id: '1',
    email: 'teste@marketplace.com',
    password: '123456',
    name: 'Usuário Teste',
    role: 'customer',
    createdAt: new Date('2024-01-01')
  }
];

// Funções auxiliares
export function findUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}

export function createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
  const newUser: User = {
    ...userData,
    id: String(users.length + 1),
    createdAt: new Date()
  };
  
  users.push(newUser);
  return newUser;
}

export function validateCredentials(email: string, password: string): User | null {
  const user = findUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
} 