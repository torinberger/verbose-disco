import Vue from 'vue'
import Vuex from 'vuex'

// import example from './module-example'

Vue.use(Vuex)

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation
 */

export default function (/* { ssrContext } */) {
  const Store = new Vuex.Store({
    modules: {
      // example
    },
    state: {
      JWTtoken: '',
      user: '',
      balance: null
    },
    mutations: {
      setJWTtoken (state, token) {
        state.JWTtoken = token
      },
      setUser (state, id) {
        state.user = id
      },
      updateBalance (state, value) {
        state.balance = value
      }
    },
    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEV
  })

  return Store
}
