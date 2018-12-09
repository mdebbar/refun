import compiler from '@ampproject/rollup-plugin-closure-compiler';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript';
import serve from 'rollup-plugin-serve';

export default {
  input: './src/examples/animations/index.ts',
  output: {
    file: './out/bundle.js',
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    typescript(),
    compiler({
      compilation_level: 'ADVANCED',
    }),
    terser(),
    serve({
      contentBase: '',
      port: 8000,
    }),
  ],
};
