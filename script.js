// Configuration Firebase (À REMPLACER PAR VOS DONNÉES)
const firebaseConfig = {
    apiKey: "AIzaSyBzCvdfEUUcBtryUqekRh91ZuHai4WG3vU",
    authDomain: "prime-purge-service.firebaseapp.com",
    projectId: "prime-purge-service",
    storageBucket: "prime-purge-service.firebasestorage.app",
    messagingSenderId: "181654423682",
    appId: "1:181654423682:web:c85e3e796fc2cff27c8c9b"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let currentPostId = null;

// AUTHENTIFICATION
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

async function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            avatar: name.charAt(0).toUpperCase(),
            createdAt: new Date()
        });
        alert('Inscription réussie !');
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

async function logout() {
    await auth.signOut();
}

// Écouter les changements d'authentification
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('userName').innerText = userData.name;
        document.getElementById('sidebarUserName').innerText = userData.name;
        document.getElementById('profileAvatar').innerText = userData.avatar;
        document.getElementById('postAvatar').innerText = userData.avatar;
        
        loadFeed();
        loadUserStats();
        loadSuggestedUsers();
    } else {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
});

// PUBLICATION
async function createPost() {
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];
    
    if (!content && !imageFile) {
        alert('Écrivez quelque chose ou ajoutez une image');
        return;
    }
    
    let imageUrl = null;
    
    if (imageFile) {
        const storageRef = storage.ref(`posts/${Date.now()}_${imageFile.name}`);
        await storageRef.put(imageFile);
        imageUrl = await storageRef.getDownloadURL();
    }
    
    await db.collection('posts').add({
        userId: currentUser.uid,
        content: content,
        imageUrl: imageUrl,
        likes: [],
        comments: [],
        createdAt: new Date()
    });
    
    document.getElementById('postContent').value = '';
    document.getElementById('postImage').value = '';
    loadFeed();
}

// AFFICHER LE FIL
async function loadFeed() {
    const postsSnapshot = await db.collection('posts')
        .orderBy('createdAt', 'desc')
        .get();
    
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    
    for (const doc of postsSnapshot.docs) {
        const post = { id: doc.id, ...doc.data() };
        const userDoc = await db.collection('users').doc(post.userId).get();
        const user = userDoc.data();
        
        const isLiked = post.likes.includes(currentUser.uid);
        
        const postDiv = document.createElement('div');
        postDiv.className = 'post-card';
        postDiv.innerHTML = `
            <div class="post-header">
                <div class="post-avatar" onclick="goToProfile('${post.userId}')">${user.avatar}</div>
                <div class="post-info">
                    <h4 onclick="goToProfile('${post.userId}')">${user.name}</h4>
                    <span>${new Date(post.createdAt.toDate()).toLocaleString()}</span>
                </div>
            </div>
            ${post.content ? `<div class="post-text">${post.content}</div>` : ''}
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" onclick="openImageModal('${post.imageUrl}')">` : ''}
            <div class="post-actions">
                <div onclick="toggleLike('${post.id}')" class="${isLiked ? 'liked' : ''}">
                    <i class="fas fa-thumbs-up"></i> ${post.likes.length} J'aime
                </div>
                <div onclick="openCommentModal('${post.id}')">
                    <i class="far fa-comment"></i> ${post.comments.length} Commentaires
                </div>
                <div onclick="sharePost('${post.id}')">
                    <i class="fas fa-share"></i> Partager
                </div>
            </div>
        `;
        feed.appendChild(postDiv);
    }
}

// LIKE
async function toggleLike(postId) {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    const post = postDoc.data();
    const likes = post.likes || [];
    
    if (likes.includes(currentUser.uid)) {
        await postRef.update({
            likes: likes.filter(id => id !== currentUser.uid)
        });
    } else {
        await postRef.update({
            likes: [...likes, currentUser.uid]
        });
    }
    loadFeed();
}

// COMMENTAIRES
async function openCommentModal(postId) {
    currentPostId = postId;
    const postDoc = await db.collection('posts').doc(postId).get();
    const post = postDoc.data();
    
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    for (const comment of post.comments || []) {
        const userDoc = await db.collection('users').doc(comment.userId).get();
        const user = userDoc.data();
        
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.innerHTML = `
            <div class="comment-avatar">${user.avatar}</div>
            <div class="comment-text">
                <div class="comment-name">${user.name}</div>
                <div class="comment-content">${comment.text}</div>
            </div>
        `;
        commentsList.appendChild(commentDiv);
    }
    
    document.getElementById('commentModal').style.display = 'flex';
}

async function addComment() {
    const text = document.getElementById('commentText').value;
    if (!text) return;
    
    const postRef = db.collection('posts').doc(currentPostId);
    const postDoc = await postRef.get();
    const post = postDoc.data();
    const comments = post.comments || [];
    
    comments.push({
        userId: currentUser.uid,
        text: text,
        createdAt: new Date()
    });
    
    await postRef.update({ comments: comments });
    document.getElementById('commentText').value = '';
    openCommentModal(currentPostId);
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
}

// ABONNEMENTS
async function followUser(userId) {
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    const following = userDoc.data().following || [];
    
    if (following.includes(userId)) {
        await userRef.update({
            following: following.filter(id => id !== userId)
        });
    } else {
        await userRef.update({
            following: [...following, userId]
        });
        
        const targetRef = db.collection('users').doc(userId);
        const targetDoc = await targetRef.get();
        const followers = targetDoc.data().followers || [];
        await targetRef.update({
            followers: [...followers, currentUser.uid]
        });
    }
    loadUserStats();
    loadSuggestedUsers();
}

async function loadUserStats() {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    const followers = userData.followers || [];
    const following = userData.following || [];
    
    document.getElementById('followersCount').innerText = followers.length;
    document.getElementById('followingCount').innerText = following.length;
}

async function loadSuggestedUsers() {
    const usersSnapshot = await db.collection('users').limit(5).get();
    const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
    const following = currentUserDoc.data().following || [];
    
    const container = document.getElementById('suggestedUsers');
    container.innerHTML = '';
    
    for (const doc of usersSnapshot.docs) {
        if (doc.id === currentUser.uid) continue;
        const user = doc.data();
        const isFollowing = following.includes(doc.id);
        
        const userDiv = document.createElement('div');
        userDiv.className = 'user-card';
        userDiv.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${user.avatar}</div>
                <strong>${user.name}</strong>
            </div>
            <button class="follow-btn ${isFollowing ? 'following' : ''}" onclick="followUser('${doc.id}')">
                ${isFollowing ? 'Abonné' : 'S\'abonner'}
            </button>
        `;
        container.appendChild(userDiv);
    }
}

// UTILITAIRES
function goToProfile(userId) {
    alert('Profil utilisateur - Fonctionnalité à venir');
}

function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="text-align:center">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <img src="${imageUrl}" style="max-width:100%; max-height:80vh">
        </div>
    `;
    document.body.appendChild(modal);
}

function sharePost(postId) {
    navigator.clipboard.writeText(window.location.href + '#post=' + postId);
    alert('Lien copié !');
}

function showFeed() {
    loadFeed();
}

function showMyPosts() {
    alert('Mes publications - Fonctionnalité à venir');
}

function showUsers() {
    loadSuggestedUsers();
    document.getElementById('feed').innerHTML = '<div class="post-card" style="padding:20px"><h3>Membres</h3><div id="suggestedUsers"></div></div>';
    loadSuggestedUsers();
}