/* ============================================
   PORTFOLIO WEBSITE - NUMAN IFTIKHAR
   JavaScript Functionality
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- Preloader ---
    const preloader = document.getElementById('preloader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.classList.add('hidden');
        }, 500);
    });

    // Fallback: hide preloader after 3s
    setTimeout(() => {
        preloader.classList.add('hidden');
    }, 3000);

    // --- Typed Text Effect ---
    const typedElement = document.getElementById('typedText');
    const words = [
        'Multi-Cloud DevOps Engineer',
        'Kubernetes Architect',
        'Terraform Expert',
        'CI/CD Specialist',
        'Cloud Security Engineer',
        'DevSecOps Practitioner'
    ];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeEffect() {
        const currentWord = words[wordIndex];

        if (isDeleting) {
            typedElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typedElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
        }

        let speed = isDeleting ? 30 : 60;

        if (!isDeleting && charIndex === currentWord.length) {
            speed = 2000; // Pause at end
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            speed = 300;
        }

        setTimeout(typeEffect, speed);
    }

    typeEffect();

    // --- Navbar Scroll Effect ---
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('backToTop');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Navbar background
        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Back to top button
        if (scrollY > 400) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }

        // Active nav link on scroll
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });

        // Reveal animations on scroll
        document.querySelectorAll('.service-card, .cert-card, .timeline-item, .contact-card, .education-card, .stat-card, .info-card, .project-card, .why-card, .testimonial-card, .process-step, .blog-card').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight - 80) {
                el.classList.add('reveal', 'active');
            }
        });
    });

    // --- Mobile Menu ---
    const hamburger = document.getElementById('hamburger');
    const navLinksContainer = document.getElementById('navLinks');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinksContainer.classList.toggle('open');
    });

    // Close menu on link click
    navLinksContainer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinksContainer.classList.remove('open');
        });
    });

    // --- Smooth Scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- Counter Animation ---
    const counters = document.querySelectorAll('.stat-number');
    let countersAnimated = false;

    function animateCounters() {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-count');
            const duration = 1500;
            const step = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += step;
                if (current < target) {
                    counter.textContent = Math.ceil(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };

            updateCounter();
        });
    }

    // Trigger counter animation when about section is visible
    const aboutSection = document.getElementById('about');
    const aboutObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersAnimated) {
                countersAnimated = true;
                animateCounters();
            }
        });
    }, { threshold: 0.3 });

    aboutObserver.observe(aboutSection);

    // --- Particles ---
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (4 + Math.random() * 4) + 's';
        particlesContainer.appendChild(particle);
    }

    // --- Contact Form ---
    const contactForm = document.getElementById('contactForm');
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const subject = formData.get('subject');
        const message = formData.get('message');

        // Construct mailto link
        const mailtoLink = `mailto:hellonumaniftikhar@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
        window.location.href = mailtoLink;

        // Show feedback
        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Opening Email Client...';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            contactForm.reset();
        }, 3000);
    });

    // --- Architecture Diagram Modal ---
    const archModal = document.createElement('div');
    archModal.className = 'arch-modal';
    archModal.innerHTML = '<button class="arch-modal-close"><i class="fas fa-times"></i></button><img src="" alt="Architecture Diagram">';
    document.body.appendChild(archModal);

    const archModalImg = archModal.querySelector('img');
    const archModalClose = archModal.querySelector('.arch-modal-close');

    document.querySelectorAll('.project-architecture').forEach(arch => {
        arch.addEventListener('click', () => {
            const imgSrc = arch.querySelector('img').src;
            archModalImg.src = imgSrc;
            archModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    archModalClose.addEventListener('click', (e) => {
        e.stopPropagation();
        archModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    archModal.addEventListener('click', () => {
        archModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && archModal.classList.contains('active')) {
            archModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

});
