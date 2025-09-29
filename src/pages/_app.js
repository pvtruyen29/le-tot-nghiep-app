// src/pages/_app.js
import '../styles/globals.css'
import 'react-image-crop/dist/ReactCrop.css' // <-- THÊM DÒNG NÀY

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
