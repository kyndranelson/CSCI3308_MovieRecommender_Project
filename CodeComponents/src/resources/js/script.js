document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.save-movie-btn').forEach(button => {
      button.addEventListener('click', function() {
        const movieData = {
          id: this.dataset.id,
          title: this.dataset.title,
          release_date: this.dataset.release_date,
          genre: this.dataset.genre,
          vote_average: this.dataset.vote_average,
          overview: this.dataset.overview
        };
  
        fetch('/save_movie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(movieData),
        })
        .then(response => response.json())
        .then(data => {
          alert(data.message);
        })
        .catch((error) => {
          console.error('Error:', error);
          alert('Error saving movie');
        });
      });
    });
  });
  