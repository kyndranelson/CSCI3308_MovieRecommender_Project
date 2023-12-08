document.addEventListener("DOMContentLoaded", () => {


    document.querySelectorAll('.save-movie-btn').forEach(button => {
      button.addEventListener('click', function() {
        if(!this.dataset.user){
          window.location.href = '/login';
          return;
        }
        const movieData = {
          id: this.dataset.id,
          title: this.dataset.title,
          release_date: this.dataset.release_date,
          genre: this.dataset.genre,
          vote_average: this.dataset.vote_average,
          overview: this.dataset.overview,
          image_url: this.dataset.image_url
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
          this.classList.add('clicked');
          alert(data.message);
        })
        .catch((error) => {
          console.error('Error:', error);
          alert('Error saving movie');
        });
      });
    });

    document.querySelectorAll('.watch-movie-btn').forEach(button => {
        button.addEventListener('click', function() {
          if(!this.dataset.user){
            window.location.href = '/login';
            return;
          }
          const movieData = {
            id: this.dataset.id,
            title: this.dataset.title,
            release_date: this.dataset.release_date,
            genre: this.dataset.genre,
            vote_average: this.dataset.vote_average,
            overview: this.dataset.overview,
            image_url: this.dataset.image_url
          };
    
          fetch('/watch_movie', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(movieData),
          })
          .then(response => response.json())
          .then(data => {
            this.classList.add('clicked');
            alert(data.message);
          })
          .catch((error) => {
            console.error('Error:', error);
            alert('Error saving movie');
          });
        });
      });

      document.querySelectorAll('.delete-save-movie-btn').forEach(button => {
        button.addEventListener('click', function() {
          if(!this.dataset.user){
            window.location.href = '/login';
            return;
          }
          const movieData = {
            title: this.dataset.title,
          };

          fetch('/delete_save_movie', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(movieData),
          })
          .then(response => response.json())
          .then(data => {
            this.classList.add('clicked');
            alert(data.message);
          })
          .catch((error) => {
            console.error('Error:', error);
            alert('Error deleting movie');
          });
        });
      });

      const form = document.querySelector('form');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
    
        const searchInput = document.querySelector('input[type="search"]');
        const searchTerm = searchInput.value.trim();
    
        if (searchTerm) {
          // Redirect to the search page with the search query as a parameter
          window.location.href = `/search?query=${encodeURIComponent(searchTerm)}`;
        }
      });
  });
  