<?php
/**
 * Numan Portfolio Theme Functions
 */

// Enqueue styles and scripts
function numan_portfolio_scripts() {
    // Google Fonts
    wp_enqueue_style('google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap', array(), null);

    // Font Awesome
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', array(), '6.5.1');

    // Theme stylesheet
    wp_enqueue_style('numan-portfolio-style', get_stylesheet_uri(), array(), '1.0');

    // Theme scripts
    wp_enqueue_script('numan-portfolio-script', get_template_directory_uri() . '/js/script.js', array(), '3.0', true);
    wp_enqueue_script('numan-chatbot-script', get_template_directory_uri() . '/js/chatbot.js', array(), '3.0', true);

    // Pass resume URL to JS
    wp_localize_script('numan-portfolio-script', 'numanData', array(
        'resumeUrl' => get_template_directory_uri() . '/Numan_Iftikhar_Resume.pdf',
        'profileImg' => get_template_directory_uri() . '/images/profile.png',
    ));
}
add_action('wp_enqueue_scripts', 'numan_portfolio_scripts');

// Theme setup
function numan_portfolio_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
}
add_action('after_setup_theme', 'numan_portfolio_setup');

// Remove WordPress admin bar on frontend
add_filter('show_admin_bar', '__return_false');