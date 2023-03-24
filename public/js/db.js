// offline data
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precodition') {
        console.log('Multiple tabs open at once');
    } else if ((err.code = 'unimplemented')) {
        console.log('Browser does not support offline persistence');
    }
});

// real-time listener
db.collection('recipies').onSnapshot((snapshot) => {
    // "onSnapShot" is used to setup a listener on the collection inside the firestore. When there is any change in the database we get the snapshot of the data base at that time. On initial load all the documents are recorded as new changes and we get all of them in the array returned by "snapshot.docChanges()". "docChanges()" is used to only get the changed documents inside the new snapshot when it is compared with the previous snapshot, so after the initial load we get only the documents which were added or deleted inside the returned list by "snapshot.docChanges()"
    // This event listener also listens to changes in the index db which is built into the browser for offline caching and this is how we are able to add data and see it appear on the screen even when we are offline, i.e. the listener gets an updated snapshot each time new data is added even when we are offline and when we come back online the firebase automatically goes and adds the new data into firestore
    snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            renderRecipe(change.doc.data(), change.doc.id);
        }
        if (change.type === 'removed') {
            removeRecipe(change.doc.id)
        }
    });
});

// add new recipe
const form = document.querySelector('form');
form.addEventListener('submit', (evt) => {
    evt.preventDefault();

    const recipe = {
        title: form.title.value,
        ingredients: form.ingredients.value,
    };

    db.collection('recipies')
        .add(recipe)
        .catch((err) => {
            console.log(err);
        });

    form.title.value = '';
    form.ingredients.value = '';
});

// delete a recipe
const recipeContainer = document.querySelector('.recipes');
recipeContainer.addEventListener('click', (evt) => {
    if (evt.target.tagName === 'I') {
        const id = evt.target.getAttribute('data-id');
        db.collection('recipies').doc(id).delete();
    }
});
