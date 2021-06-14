"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const serviceAccount = require("../firebase_key/modelion-key.json");
const http = require("http");
class FirebaseWorker {
    constructor() {
        this.id = 1;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Start Firebase Connection");
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            this.db = admin.firestore();
            this.startWorker();
        });
    }
    startWorker() {
        return __awaiter(this, void 0, void 0, function* () {
            const orders = yield this.fetchOrders();
            if (orders.length > 0) {
                const firstFreeOrder = orders[0];
                this.apply(firstFreeOrder);
            }
            else {
                const unsub = this.db.collection("orders").onSnapshot((snapshot) => {
                    unsub();
                    this.startWorker();
                });
            }
        });
    }
    // Idee für eine skalierbare Architektur
    // Wenn eine neue Order ankommt, schickt ein Worker eine Application
    // Firebase als zentrale instanz weist der Order einen beworbenen Worker zu
    // Ein Worker bearbeitet nur Aufgaben die ihm wirklich zugewiesen wurden
    fetchOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            const ref = this.db.collection("orders").orderBy("timestamp", "desc");
            const snapshot = yield ref.get();
            const openOrders = snapshot.docs
                .map((doc) => {
                return {
                    data: doc.data(),
                    id: doc.id,
                };
            })
                .filter((doc) => {
                return !doc.worker;
            });
            return openOrders;
        });
    }
    // Returns true if this worker gets this order, false if it didnt
    apply(order) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Creating Application for new Order");
            const application = {
                timestamp: new Date().getTime(),
                worker: this.id,
                orderId: order.id,
            };
            yield this.db.collection("applications").add(application);
            const unsub = this.db
                .collection("orders")
                .doc(application.orderId)
                .onSnapshot((snapshot) => {
                const order = snapshot.data();
                if (order.worker) {
                    unsub();
                    console.log("Worker Zuteilung ist geschehen");
                }
            });
        });
    }
}
exports.default = FirebaseWorker;
//# sourceMappingURL=firebase.js.map