import { run } from '../../framework';
import { root } from '../../html';
import { app } from './app';

run(() => app(), root(document.body));
