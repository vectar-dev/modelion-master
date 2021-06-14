const admin = require("firebase-admin");
const serviceAccount = require("../firebase_key/modelion-key.json");
const http = require("http");

export default class FirebaseWorker {
    id = 1;
    db: any;

    constructor() {}

    async start() {
        console.log("Start Firebase Connection");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        this.db = admin.firestore();
        this.startMaster();
    }

    async startMaster() {
        const applications = await this.fetchApplications();
        if (applications.length > 0) {
            await this.processApplications(applications);
            this.startMaster();
        } else {
            const unsub = this.db.collection("applcations").onSnapshot((snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        unsub();
                        this.startMaster();
                    }
                })
            });
        }
        
    }

    async fetchApplications() {
        const ref = this.db.collection("applications").orderBy("timestamp", "desc");
        const snapshot = await ref.get();
        const openApplications = snapshot.docs
            .map((doc) => {
                return {
                    data: doc.data(),
                    id: doc.id,
                };
            })
            .filter((doc) => {
                return !doc.status;
            });
        return openApplications;
    }

    async processApplications(applications) {
        for(let application of applications) {
            if(!application.data.status) {
                const others = applications.filter(application => application.data.orderId === application.orderId);
                await this.approveApplication(application);
                for(let otherApplication of others) {
                    await this.declineApplication(otherApplication);
                }
            }
        }
    }

    async declineApplication(application) {
        console.log("declineApplication");
        application.data.status = "declined";
        await this.db.collection('applications').doc(application.id).update(application.data);
    }

    async approveApplication(application) {
        console.log("approve Application");
        application.data.status = "approved";
        await this.db.collection('applications').doc(application.id).update(application.data);
        await this.db.collection('orders').doc(application.data.orderId).update({worker: application.data.worker})
    }
}
