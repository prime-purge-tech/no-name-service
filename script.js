// Portfolio - 10 images personnalisées (liens Unsplash gratuits)
const portfolioImages = [
    "https://www.image2url.com/r2/default/images/1776199504709-546f25dc-4755-42ed-8eda-9b3f1a3736c2.jpg", // Hacking
    "https://www.image2url.com/r2/default/images/1776199641799-73797395-6937-447c-8bd7-3787ec934593.jpg", // Tech
    "https://www.image2url.com/r2/default/images/1776199783881-b9cde0c7-ab49-474c-b658-3d9ebb48550c.jpg", // Code
    "https://www.image2url.com/r2/default/images/1776184942622-40a7c354-fdc3-46c3-8c26-d4ba5e8c9442.jpg", // Digital
    "https://i.ibb.co/7NyjL4YY/RD313834393339383635353840732e77686174736170702e6e6574-581511.jpg", // Dev
    "https://ibb.co/7fqCRpz", // Matrix
    "https://ibb.co/9mT569Yj", // Labo
    "https://ibb.co/Fq8P02cH", // Cyber
    "https://ibb.co/2YpbKDcY", // Dark
    "https://ibb.co/xShppzGW"  // Hacker
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

// Animation au scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.card, .gallery-item, .contact-card, .about-content');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
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
        }
        .modal-content img {
            width: 100%;
            height: auto;
            border-radius: 10px;
        }
        .close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover {
            color: #ff4444;
        }
    `;
    document.head.appendChild(style);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    generateGallery();
    animateOnScroll();
    initSmoothScroll();
    addModalStyles();
});