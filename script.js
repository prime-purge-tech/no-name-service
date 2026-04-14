// Vos 10 images personnalisées
const portfolioImages = [
    "https://www.image2url.com/r2/default/images/1776199504709-546f25dc-4755-42ed-8eda-9b3f1a3736c2.jpg",
    "https://www.image2url.com/r2/default/images/1776199641799-73797395-6937-447c-8bd7-3787ec934593.jpg",
    "https://www.image2url.com/r2/default/images/1776199783881-b9cde0c7-ab49-474c-b658-3d9ebb48550c.jpg",
    "https://www.image2url.com/r2/default/images/1776184942622-40a7c354-fdc3-46c3-8c26-d4ba5e8c9442.jpg",
    "https://i.ibb.co/7NyjL4YY/RD313834393339383635353840732e77686174736170702e6e6574-581511.jpg",
    "https://www.image2url.com/r2/default/images/1776199504709-546f25dc-4755-42ed-8eda-9b3f1a3736c2.jpg",
    "https://www.image2url.com/r2/default/images/1776199641799-73797395-6937-447c-8bd7-3787ec934593.jpg",
    "https://www.image2url.com/r2/default/images/1776199783881-b9cde0c7-ab49-474c-b658-3d9ebb48550c.jpg",
    "https://www.image2url.com/r2/default/images/1776184942622-40a7c354-fdc3-46c3-8c26-d4ba5e8c9442.jpg",
    "https://i.ibb.co/7NyjL4YY/RD313834393339383635353840732e77686174736170702e6e6574-581511.jpg"
];

// Générer la galerie
function generateGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    portfolioImages.forEach((imgUrl, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${imgUrl}" alt="Portfolio ${index + 1}">`;
        item.onclick = () => openModal(imgUrl);
        gallery.appendChild(item);
    });
}

// Modal pour agrandir les images
function openModal(imgSrc) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <img src="${imgSrc}" alt="Agrandissement">
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Navigation smooth
function initSmoothScroll() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Ajouter les styles du modal
function addModalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            cursor: pointer;
        }
        .modal-content {
            max-width: 90%;
            max-height: 90%;
            position: relative;
        }
        .modal-content img {
            width: 100%;
            height: auto;
            border-radius: 10px;
        }
        .close {
            position: absolute;
            top: -40px;
            right: 0;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover {
            color: #1877f2;
        }
    `;
    document.head.appendChild(style);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    generateGallery();
    initSmoothScroll();
    addModalStyles();
});