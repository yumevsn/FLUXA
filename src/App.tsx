import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { albumsOutline, settingsOutline } from 'ionicons/icons';

import Home from './pages/Home';
import DeckScreen from './pages/DeckScreen';
import AddCard from './pages/AddCard';
import CardDetail from './pages/CardDetail';
import ReviewMode from './pages/ReviewMode';
import Settings from './pages/Settings';

setupIonicReact({ mode: 'md' });

const App = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/" component={Home} />
          <Route exact path="/deck/:deckId" component={DeckScreen} />
          <Route exact path="/deck/:deckId/add" component={AddCard} />
          <Route exact path="/deck/:deckId/card/:cardId" component={CardDetail} />
          <Route exact path="/deck/:deckId/review" component={ReviewMode} />
          <Route exact path="/settings" component={Settings} />
          <Route render={() => <Redirect to="/" />} />
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="decks" href="/">
            <IonIcon icon={albumsOutline} />
            <IonLabel>Decks</IonLabel>
          </IonTabButton>
          <IonTabButton tab="settings" href="/settings">
            <IonIcon icon={settingsOutline} />
            <IonLabel>Settings</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
