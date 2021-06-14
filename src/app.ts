import FirebaseWorker from './firebase';
process.env.TZ = 'Europe/Berlin' 


const PORT = process.env.PORT;

class App {

  public start() {
    new FirebaseWorker().start();
  }
}

export default App;