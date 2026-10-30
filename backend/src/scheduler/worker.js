import { parentPort, workerData } from 'node:worker_threads';
import { runAlgorithm } from './algorithms.js';
parentPort.postMessage(runAlgorithm(workerData.P, workerData.algo, workerData.params));
