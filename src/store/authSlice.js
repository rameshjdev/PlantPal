import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for login (simulated API call)
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // In a real app, this would be an API call
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Demo login logic (accept any email/password)
          if (email && password) {
            resolve({
              id: '1',
              name: 'Demo User',
              email,
              token: 'fake-auth-token',
            });
          } else {
            reject(new Error('Invalid credentials'));
          }
        }, 800);
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for signup (simulated API call)
export const signup = createAsyncThunk(
  'auth/signup',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      // In a real app, this would be an API call
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Demo signup logic (accept any valid input)
          if (name && email && password) {
            resolve({
              id: Date.now().toString(),
              name,
              email,
              token: 'fake-auth-token',
            });
          } else {
            reject(new Error('Invalid signup data'));
          }
        }, 800);
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: {
      id: '1',
      name: 'Demo User',
      email: 'demo@example.com',
    },
    token: 'fake-auth-token',
    isAuthenticated: true, // Set to true for testing
    status: 'succeeded',
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = {
          id: action.payload.id,
          name: action.payload.name,
          email: action.payload.email,
        };
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Login failed';
      })
      
      // Signup cases
      .addCase(signup.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = {
          id: action.payload.id,
          name: action.payload.name,
          email: action.payload.email,
        };
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Signup failed';
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer; 