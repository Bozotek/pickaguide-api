# pickaguide-api

## Documentation

### Generate

    npm run docs:generate

Cette commande va générer la documentation de l'api

### View

    npm run docs:View

Ceci va ouvrir la documentation actuelle dans un nouvel onglet du navigateur

## Launch in dev mode

    make dev

Il faut aussi cloner le repository `pickaguide-ops` et aller dans `dev`, ensuite:

    make mongo

Ceci lancera en local l'image docker de la base de données vide

## Launch tests

    make test-api

## Staging

Après que votre branche soit mergée avec `dev` et que vous avez reçu dans slack dans le channel
`#build` la notification d'une build réussie alors l'api sera actif sur (http://82.223.82.41:3030/) ou (http://pickaguide.fr:3030/)

## Production

Après que `dev` soit mergée avec `master` et que vous avez reçu dans slack dans le channel
`#build` la notification d'une build réussie alors l'api sera actif sur (https://82.223.82.41:3000/) ou (https://pickaguide.fr:3000/)
